import crypto from 'node:crypto';
import { Bot } from 'grammy';
import { getDb } from '../db.js';
import { SipService } from './sip.js';

let wsServerInstance = null;

export function setWsServer(wsServer) {
  wsServerInstance = wsServer;
}

function getChannelConfig(channel) {
  const db = getDb();
  const row = db.prepare('SELECT enabled, config FROM channel_config WHERE channel = ?').get(channel);
  if (!row) return null;
  return {
    enabled: !!row.enabled,
    config: typeof row.config === 'string' ? JSON.parse(row.config || '{}') : (row.config || {}),
  };
}

export class NotificationService {
  constructor() {
    this.sipService = null;
    this.telegramBotCache = null;
  }

  getSipService() {
    if (!this.sipService) this.sipService = new SipService();
    return this.sipService;
  }

  getTelegramBot() {
    if (this.telegramBotCache) return this.telegramBotCache;
    const tg = getChannelConfig('telegram');
    if (!tg || !tg.enabled || !tg.config.bot_token) return null;
    try {
      this.telegramBotCache = new Bot(tg.config.bot_token);
      return this.telegramBotCache;
    } catch (e) {
      console.error('[notifications] Failed to init Telegram bot:', e.message);
      return null;
    }
  }

  clearCache() {
    this.telegramBotCache = null;
    this.sipService = null;
  }

  async send(title, description, { channel = 'all', config = {}, reminderId = null } = {}) {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const logId = crypto.randomUUID();

    try {
      const channels = channel === 'all'
        ? ['telegram', 'signal', 'sip', 'websocket']
        : [channel];

      for (const ch of channels) {
        switch (ch) {
          case 'telegram': {
            const cfg = getChannelConfig('telegram');
            if (cfg && cfg.enabled) {
              const chatId = config.chatId || cfg.config.chat_id;
              if (chatId) await this.sendTelegram(chatId, title, description);
            }
            break;
          }
          case 'signal': {
            const cfg = getChannelConfig('signal');
            if (cfg && cfg.enabled) {
              const number = config.number || cfg.config.number;
              if (number) await this.sendSignal(number, `${title}\n\n${description}`);
            }
            break;
          }
          case 'sip': {
            const cfg = getChannelConfig('sip');
            if (cfg && cfg.enabled) {
              const phone = config.phoneNumber || cfg.config.phone_number;
              if (phone) await this.sendSipCall(phone, `${title}: ${description}`);
            }
            break;
          }
          case 'websocket':
            await this.sendWebSocket(config.userId, { type: 'reminder', title, description, reminderId });
            break;
        }
      }

      db.prepare('INSERT INTO notification_log (id, reminder_id, channel, sent_at, status) VALUES (?, ?, ?, ?, ?)')
        .run(logId, reminderId, channel, now, 'sent');
    } catch (err) {
      console.error('[notifications] Send error:', err);
      db.prepare('INSERT INTO notification_log (id, reminder_id, channel, sent_at, status, error) VALUES (?, ?, ?, ?, ?, ?)')
        .run(logId, reminderId, channel, now, 'error', err.message);
    }
  }

  async sendTelegram(chatId, title, description) {
    const bot = this.getTelegramBot();
    if (!bot) return;
    const text = `*${escapeMarkdown(title)}*\n\n${escapeMarkdown(description)}`;
    await bot.api.sendMessage(chatId, text, { parse_mode: 'MarkdownV2' });
  }

  async sendSignal(number, message) {
    const cfg = getChannelConfig('signal');
    if (!cfg || !cfg.enabled) return;
    const apiUrl = cfg.config.api_url;
    const signalNumber = cfg.config.number;
    if (!apiUrl || !signalNumber) return;
    const response = await fetch(`${apiUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, number: signalNumber, recipients: [number] }),
    });
    if (!response.ok) throw new Error(`Signal send failed: ${response.status}`);
  }

  async sendSipCall(phoneNumber, message) {
    const svc = this.getSipService();
    if (!svc.isConfigured()) return;
    await svc.makeCall(phoneNumber, message);
  }

  async sendWebSocket(userId, data) {
    if (!wsServerInstance) return;
    const payload = JSON.stringify({ userId, ...data });
    wsServerInstance.clients.forEach((client) => {
      if (client.readyState === 1) client.send(payload);
    });
  }
}

function escapeMarkdown(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
