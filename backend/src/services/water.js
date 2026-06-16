import crypto from 'node:crypto';
import { getDb } from '../db.js';

export class WaterService {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.schedule = null;
  }

  getSettings() {
    return getDb().prepare('SELECT * FROM water_settings WHERE user_id = ?').get('default');
  }

  logWater(amountMl = 250, channel = null) {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO water_log (id, user_id, amount_ml, logged_at, channel) VALUES (?, ?, ?, ?, ?)')
      .run(id, 'default', amountMl, now, channel);
    return { id, amount_ml: amountMl, logged_at: now };
  }

  getTodayTotal() {
    const db = getDb();
    const startOfDay = this.getStartOfDay();
    const row = db.prepare('SELECT COALESCE(SUM(amount_ml), 0) as total FROM water_log WHERE logged_at >= ? AND user_id = ?').get(startOfDay, 'default');
    return row ? row.total : 0;
  }

  getStartOfDay() {
    const now = new Date();
    return Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
  }

  async checkReminder() {
    try {
      const settings = this.getSettings();
      if (!settings || !settings.enabled) return;

      const now = new Date();
      const hour = now.getHours();
      if (hour < settings.start_hour || hour >= settings.end_hour) return;

      const db = getDb();
      const lastLog = db.prepare(
        'SELECT logged_at FROM water_log WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1'
      ).get('default');

      const nowUnix = Math.floor(Date.now() / 1000);
      const intervalMs = (settings.interval_minutes || 30) * 60;

      if (!lastLog || (nowUnix - lastLog.logged_at) >= intervalMs) {
        const todayTotal = this.getTodayTotal();
        const goal = settings.daily_goal_ml || 2000;
        const remaining = Math.max(0, goal - todayTotal);

        await this.notificationService.send(
          '💧 Water Reminder',
          `Time to drink water! Today's progress: ${todayTotal}ml / ${goal}ml (${remaining}ml remaining)`,
          { channel: settings.reminder_channel || 'all', config: {} }
        );
      }
    } catch (err) {
      console.error('[water] checkReminder error:', err);
    }
  }
}
