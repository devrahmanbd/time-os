import crypto from 'node:crypto';
import { getDb } from '../db.js';

export class ReminderService {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.interval = null;
  }

  start(intervalMs = 30000) {
    if (this.interval) return;
    this.interval = setInterval(() => this.checkDue(), intervalMs);
    console.log('[reminders] Started checking every', intervalMs, 'ms');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[reminders] Stopped');
    }
  }

  createReminder({ title, description = '', due_at, repeat = 'none', channel = 'all', channel_config = '{}', source = 'manual' }) {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO reminders (id, title, description, due_at, repeat, channel, channel_config, status, created_at, updated_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(id, title, description, due_at, repeat, channel, channel_config, now, now, source);
    return { id, title, description, due_at, repeat, channel, channel_config, source };
  }

  updateReminder(id, fields) {
    const db = getDb();
    const allowed = ['title', 'description', 'due_at', 'repeat', 'channel', 'channel_config', 'status'];
    const now = Math.floor(Date.now() / 1000);
    const sets = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (sets.length === 0) return null;
    sets.push('updated_at = ?');
    values.push(now);
    values.push(id);
    db.prepare(`UPDATE reminders SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  }

  completeReminder(id) {
    const db = getDb();
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (!reminder) return null;
    const now = Math.floor(Date.now() / 1000);

    if (reminder.repeat && reminder.repeat !== 'none') {
      const nextDue = this.calcNextRepeat(reminder.repeat, reminder.due_at);
      db.prepare('UPDATE reminders SET due_at = ?, updated_at = ?, completed_at = ? WHERE id = ?')
        .run(nextDue, now, now, id);
      return { ...reminder, due_at: nextDue, nextDue };
    } else {
      db.prepare('UPDATE reminders SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?')
        .run('completed', now, now, id);
      return { ...reminder, status: 'completed' };
    }
  }

  calcNextRepeat(repeat, fromTimestamp) {
    const date = new Date(fromTimestamp * 1000);
    switch (repeat) {
      case 'hourly':
        date.setHours(date.getHours() + 1);
        break;
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      default:
        return fromTimestamp;
    }
    return Math.floor(date.getTime() / 1000);
  }

  checkDue() {
    try {
      const db = getDb();
      const now = Math.floor(Date.now() / 1000);
      const dueReminders = db.prepare('SELECT * FROM reminders WHERE status = ? AND due_at <= ?').all('active', now);

      for (const reminder of dueReminders) {
        let config = {};
        try {
          config = JSON.parse(reminder.channel_config || '{}');
        } catch { /* ignore */ }

        this.notificationService.send(reminder.title, reminder.description, {
          channel: reminder.channel,
          config,
          reminderId: reminder.id,
        });

        this.completeReminder(reminder.id);
      }
    } catch (err) {
      console.error('[reminders] checkDue error:', err);
    }
  }
}
