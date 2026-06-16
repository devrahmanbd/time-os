import { Bot } from 'grammy';
import crypto from 'node:crypto';
import { getDb } from '../db.js';

export class TelegramBot {
  constructor(reminderService, pomodoroService, waterService) {
    this.reminderService = reminderService;
    this.pomodoroService = pomodoroService;
    this.waterService = waterService;
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.bot = null;
  }

  start() {
    if (!this.token) {
      console.warn('[telegram] Bot token not configured');
      return;
    }
    this.bot = new Bot(this.token);

    this.bot.command('start', (ctx) => {
      ctx.reply(
        '🧠 *Mnemonic Bot*\n\nI help you manage reminders, tasks, pomodoro, and water intake.\n\nCommands:\n`/remind <text> at <time>` \\- Set a reminder\n`/tasks` \\- List today\'s tasks\n`/pomodoro start|pause|reset` \\- Control pomodoro\n`/water [amount_ml]` \\- Log water intake',
        { parse_mode: 'MarkdownV2' }
      );
    });

    this.bot.command('remind', (ctx) => {
      try {
        const text = ctx.match;
        if (!text) {
          return ctx.reply('Usage: /remind <text> at <time>\nExample: /remind Call John at 14:30');
        }
        const parts = text.split(' at ');
        if (parts.length < 2) {
          return ctx.reply('Please specify time with "at". Example: /remind Call John at 14:30');
        }
        const title = parts[0].trim();
        const timeStr = parts.slice(1).join(' at ').trim();
        const dueDate = this.parseTime(timeStr);
        if (!dueDate) {
          return ctx.reply('Could not parse time. Use format like "14:30" or "in 30 minutes"');
        }
        const config = { chatId: ctx.chat.id };
        this.reminderService.createReminder({
          title,
          description: `From Telegram by ${ctx.from.first_name || 'user'}`,
          due_at: dueDate,
          repeat: 'none',
          channel: 'telegram',
          channel_config: JSON.stringify(config),
          source: 'telegram',
        });
        ctx.reply(`✅ Reminder set: "${title}" at ${new Date(dueDate * 1000).toLocaleString()}`);
      } catch (err) {
        console.error('[telegram] /remind error:', err);
        ctx.reply('Failed to create reminder.');
      }
    });

    this.bot.command('tasks', (ctx) => {
      try {
        const db = getDb();
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}`;
        const tasks = db.prepare('SELECT * FROM tasks WHERE due_date = ? AND status = ?').all(dateStr, 'pending');
        if (tasks.length === 0) {
          return ctx.reply('No tasks for today. 🎉');
        }
        const lines = tasks.map((t, i) => `${i + 1}. [${t.marker}] ${t.title}`);
        ctx.reply(`📋 *Today's Tasks:*\n\n${lines.join('\n')}`, { parse_mode: 'MarkdownV2' });
      } catch (err) {
        console.error('[telegram] /tasks error:', err);
        ctx.reply('Failed to fetch tasks.');
      }
    });

    this.bot.command('pomodoro', (ctx) => {
      try {
        const cmd = (ctx.match || '').trim().toLowerCase();
        if (cmd === 'start') {
          this.pomodoroService.start();
          const state = this.pomodoroService.getState();
          ctx.reply(`🍅 Pomodoro started! ${state.workMinutes} min session.`);
        } else if (cmd === 'pause') {
          this.pomodoroService.pause();
          ctx.reply('⏸️ Pomodoro paused.');
        } else if (cmd === 'reset') {
          this.pomodoroService.reset();
          ctx.reply('🔄 Pomodoro reset.');
        } else {
          const state = this.pomodoroService.getState();
          ctx.reply(
            `🍅 *Pomodoro State:*\nState: ${state.state}\nWork: ${state.workMinutes}m \\| Break: ${state.breakMinutes}m\nCompleted: ${state.completed}\nRemaining: ${Math.floor(state.remaining / 60)}m ${state.remaining % 60}s\n\nUsage: /pomodoro start\\|pause\\|reset`,
            { parse_mode: 'MarkdownV2' }
          );
        }
      } catch (err) {
        console.error('[telegram] /pomodoro error:', err);
        ctx.reply('Failed to control pomodoro.');
      }
    });

    this.bot.command('water', (ctx) => {
      try {
        const amount = parseInt(ctx.match || '250', 10);
        this.waterService.logWater(amount, 'telegram');
        const total = this.waterService.getTodayTotal();
        const goal = (this.waterService.getSettings() || {}).daily_goal_ml || 2000;
        ctx.reply(`💧 Logged ${amount}ml water! Today: ${total}ml / ${goal}ml`);
      } catch (err) {
        console.error('[telegram] /water error:', err);
        ctx.reply('Failed to log water.');
      }
    });

    this.bot.start({ onStart: () => console.log('[telegram] Bot started') });
  }

  parseTime(timeStr) {
    const now = new Date();
    timeStr = timeStr.toLowerCase().trim();

    // "HH:MM" format
    const hmm = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (hmm) {
      const hours = parseInt(hmm[1], 10);
      const minutes = parseInt(hmm[2], 10);
      const d = new Date(now);
      d.setHours(hours, minutes, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return Math.floor(d.getTime() / 1000);
    }

    // "in X minutes/hours" format
    const inMatch = timeStr.match(/^in (\d+) (minute|minutes|hour|hours)$/);
    if (inMatch) {
      const num = parseInt(inMatch[1], 10);
      const unit = inMatch[2];
      const ms = unit.startsWith('minute') ? num * 60 * 1000 : num * 60 * 60 * 1000;
      return Math.floor((Date.now() + ms) / 1000);
    }

    return null;
  }

  async sendMessage(chatId, text) {
    if (!this.bot) return;
    try {
      await this.bot.api.sendMessage(chatId, text);
    } catch (err) {
      console.error('[telegram] sendMessage error:', err);
    }
  }
}
