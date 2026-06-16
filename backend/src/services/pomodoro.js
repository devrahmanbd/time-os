import crypto from 'node:crypto';
import { getDb } from '../db.js';

export class PomodoroService {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.workMinutes = 25;
    this.breakMinutes = 5;
    this.completed = 0;
    this.state = 'idle';
    this.remaining = 0;
    this.interval = null;
    this.sessionId = null;
    this.startedAt = null;
    this.channel = 'all';

    this.loadState();
  }

  loadState() {
    try {
      const db = getDb();
      const session = db.prepare('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC LIMIT 1').get();
      if (session) {
        this.workMinutes = session.work_minutes;
        this.breakMinutes = session.break_minutes;
        this.completed = session.completed_pomodoros;
        this.state = session.state;
        this.sessionId = session.id;
        this.channel = session.channel;
        if (this.state === 'running') {
          this.state = 'idle';
        }
        this.remaining = this.workMinutes * 60;
      }
    } catch (err) {
      console.error('[pomodoro] loadState error:', err);
    }
  }

  saveState() {
    const db = getDb();
    if (!this.sessionId) {
      this.sessionId = crypto.randomUUID();
      this.startedAt = Math.floor(Date.now() / 1000);
      db.prepare(`
        INSERT INTO pomodoro_sessions (id, user_id, work_minutes, break_minutes, completed_pomodoros, state, started_at, channel)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?)
      `).run(this.sessionId, this.workMinutes, this.breakMinutes, this.completed, this.state, this.startedAt, this.channel);
    } else {
      db.prepare(`
        UPDATE pomodoro_sessions SET work_minutes=?, break_minutes=?, completed_pomodoros=?, state=?, channel=? WHERE id=?
      `).run(this.workMinutes, this.breakMinutes, this.completed, this.state, this.channel, this.sessionId);
    }
  }

  start() {
    if (this.state === 'running') return;
    this.state = 'running';
    this.remaining = this.workMinutes * 60;
    this.startedAt = Math.floor(Date.now() / 1000);
    this.saveState();

    this.interval = setInterval(() => {
      this.remaining--;
      if (this.remaining <= 0) {
        this.completeSession();
      }
    }, 1000);
  }

  completeSession() {
    clearInterval(this.interval);
    this.interval = null;
    this.completed++;

    this.notificationService.send(
      'Pomodoro Complete',
      `You completed pomodoro #${this.completed}! Time for a break.`,
      { channel: this.channel, config: {} }
    );

    this.state = 'break';
    this.remaining = this.breakMinutes * 60;
    this.saveState();

    this.interval = setInterval(() => {
      this.remaining--;
      if (this.remaining <= 0) {
        this.completeBreak();
      }
    }, 1000);
  }

  completeBreak() {
    clearInterval(this.interval);
    this.interval = null;
    this.state = 'idle';
    this.remaining = this.workMinutes * 60;
    this.saveState();
  }

  pause() {
    if (this.state !== 'running') return;
    clearInterval(this.interval);
    this.interval = null;
    this.state = 'paused';
    this.saveState();
  }

  reset() {
    clearInterval(this.interval);
    this.interval = null;
    this.state = 'idle';
    this.remaining = this.workMinutes * 60;
    this.completed = 0;
    this.sessionId = null;
    this.saveState();
  }

  getState() {
    return {
      workMinutes: this.workMinutes,
      breakMinutes: this.breakMinutes,
      completed: this.completed,
      state: this.state,
      remaining: this.remaining,
      sessionId: this.sessionId,
      channel: this.channel,
    };
  }

  updateSettings(workMinutes, breakMinutes) {
    this.workMinutes = workMinutes;
    this.breakMinutes = breakMinutes;
    if (this.state === 'idle') {
      this.remaining = workMinutes * 60;
    }
    this.saveState();
  }
}
