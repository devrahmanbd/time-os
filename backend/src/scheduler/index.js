import cron from 'node-cron';
import { getDb } from '../db.js';

export class Scheduler {
  constructor(reminderService, waterService, obsidianService) {
    this.reminderService = reminderService;
    this.waterService = waterService;
    this.obsidianService = obsidianService;
    this.jobs = [];
  }

  start() {
    // Every 30 seconds: check due reminders
    const reminderJob = cron.schedule('*/30 * * * * *', () => {
      this.reminderService.checkDue();
    });
    this.jobs.push(reminderJob);

    // Every minute: check water reminders
    const waterJob = cron.schedule('* * * * *', () => {
      this.waterService.checkReminder();
    });
    this.jobs.push(waterJob);

    // Every hour: cleanup old notification_log entries (>7 days)
    const cleanupJob = cron.schedule('0 * * * *', () => {
      try {
        const db = getDb();
        const cutoff = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        const result = db.prepare('DELETE FROM notification_log WHERE sent_at < ?').run(cutoff);
        if (result.changes > 0) {
          console.log(`[scheduler] Cleaned up ${result.changes} old notification log entries`);
        }
      } catch (err) {
        console.error('[scheduler] Cleanup error:', err);
      }
    });
    this.jobs.push(cleanupJob);

    // Every 5 minutes: auto-sync obsidian if vault path configured
    if (process.env.OBSIDIAN_VAULT_PATH) {
      const obsidianJob = cron.schedule('*/5 * * * *', () => {
        this.obsidianService.syncAll();
      });
      this.jobs.push(obsidianJob);
    }

    console.log(`[scheduler] Started ${this.jobs.length} jobs`);
  }

  stop() {
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];
    console.log('[scheduler] All jobs stopped');
  }
}
