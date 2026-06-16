import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { getDb } from '../db.js';

export function createRouter(reminderService, pomodoroService, waterService, obsidianService) {
  const router = express.Router();

  router.use(cors());
  router.use(express.json());

  // ── Reminders ──────────────────────────────────────
  router.get('/reminders', (req, res) => {
    try {
      const db = getDb();
      const status = req.query.status || 'active';
      let rows;
      if (status === 'all') {
        rows = db.prepare('SELECT * FROM reminders ORDER BY due_at ASC').all();
      } else {
        rows = db.prepare('SELECT * FROM reminders WHERE status = ? ORDER BY due_at ASC').all(status);
      }
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/reminders', (req, res) => {
    try {
      const { title, description, due_at, repeat, channel, channel_config } = req.body;
      if (!title || !due_at) {
        return res.status(400).json({ error: 'title and due_at are required' });
      }
      const reminder = reminderService.createReminder({
        title,
        description: description || '',
        due_at: Math.floor(new Date(due_at).getTime() / 1000),
        repeat: repeat || 'none',
        channel: channel || 'all',
        channel_config: channel_config || '{}',
      });
      res.status(201).json(reminder);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/reminders/:id', (req, res) => {
    try {
      const fields = { ...req.body };
      if (fields.due_at) {
        fields.due_at = Math.floor(new Date(fields.due_at).getTime() / 1000);
      }
      const updated = reminderService.updateReminder(req.params.id, fields);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/reminders/:id', (req, res) => {
    try {
      const db = getDb();
      const now = Math.floor(Date.now() / 1000);
      const result = db.prepare('UPDATE reminders SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
        .run('deleted', now, req.params.id, 'active');
      if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/reminders/:id/complete', (req, res) => {
    try {
      const result = reminderService.completeReminder(req.params.id);
      if (!result) return res.status(404).json({ error: 'Not found' });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Tasks ──────────────────────────────────────────
  router.get('/tasks', (req, res) => {
    try {
      const db = getDb();
      const date = req.query.date;
      let rows;
      if (date) {
        rows = db.prepare(`
          SELECT * FROM tasks WHERE due_date = ?
          ORDER BY
            CASE marker WHEN ' ' THEN 0 WHEN '-' THEN 1 WHEN '--' THEN 2 WHEN '+' THEN 3 WHEN 'x' THEN 4 WHEN 'x2' THEN 5 ELSE 6 END,
            created_at DESC
        `).all(date);
      } else {
        rows = db.prepare(`
          SELECT * FROM tasks
          ORDER BY
            CASE marker WHEN ' ' THEN 0 WHEN '-' THEN 1 WHEN '--' THEN 2 WHEN '+' THEN 3 WHEN 'x' THEN 4 WHEN 'x2' THEN 5 ELSE 6 END,
            created_at DESC
        `).all();
      }
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/tasks', (req, res) => {
    try {
      const db = getDb();
      const { title, marker, due_date, source, tag, failed_count } = req.body;
      if (!title) return res.status(400).json({ error: 'title is required' });
      const id = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      db.prepare(`
        INSERT INTO tasks (id, title, marker, source_file, tag, due_date, status, obsidian_sync, created_at, failed_count)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
      `).run(id, title, marker || ' ', source || null, tag || null, due_date || null, now, failed_count || 0);
      res.status(201).json({ id, title, marker: marker || ' ', source_file: source || null, tag: tag || null, due_date: due_date || null, status: 'pending', failed_count: failed_count || 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/tasks/:id', (req, res) => {
    try {
      const db = getDb();
      const { marker, status, failed_count } = req.body;
      const sets = [];
      const values = [];
      if (marker !== undefined) { sets.push('marker = ?'); values.push(marker); }
      if (failed_count !== undefined) { sets.push('failed_count = ?'); values.push(failed_count); }
      if (status !== undefined) {
        sets.push('status = ?');
        values.push(status);
        if (status === 'completed') {
          sets.push('completed_at = ?');
          values.push(Math.floor(Date.now() / 1000));
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
      values.push(req.params.id);
      db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      if (!task) return res.status(404).json({ error: 'Not found' });
      res.json(task);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Obsidian ───────────────────────────────────────
  router.get('/obsidian/health', (req, res) => {
    try {
      const db = getDb();
      const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
      const reminderCount = db.prepare("SELECT COUNT(*) as count FROM reminders WHERE status = 'active'").get();
      res.json({
        status: 'ok',
        version: '1.0.0',
        uptime: process.uptime(),
        tasks_total: taskCount ? taskCount.count : 0,
        reminders_active: reminderCount ? reminderCount.count : 0,
        obsidian_watching: obsidianService && obsidianService.watcher !== null,
        vault_configured: !!(obsidianService && obsidianService.getVaultPath()),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/obsidian/markers', (req, res) => {
    try {
      const db = getDb();
      const date = req.query.date ||
        `${String(new Date().getDate()).padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()]}`;
      const markers = db.prepare(`
        SELECT marker, COUNT(*) as count FROM tasks WHERE due_date = ? GROUP BY marker
      `).all(date);
      const map = { ' ': 0, '-': 0, '--': 0, '+': 0, 'x': 0, 'x2': 0, 'x3': 0 };
      for (const row of markers) {
        if (row.marker in map) map[row.marker] = row.count;
      }
      const doneCount = map['x'] + map['x2'] + map['x3'];
      const total = Object.values(map).reduce((a, b) => a + b, 0);
      res.json({
        date,
        total,
        done: doneCount,
        pending: map[' '],
        grace: map['-'],
        failed_twice: map['--'],
        skipped: map['+'],
        done_day1: map['x'],
        done_day2: map['x2'],
        done_day3: map['x3'],
        series: [
          { key: 'doneDay1', label: 'Done [x]', count: map['x'], color: '#a6e3a1' },
          { key: 'doneDay2', label: 'Done [x2]', count: map['x2'], color: '#7ec87e' },
          { key: 'doneDay3', label: 'Done [x3]', count: map['x3'], color: '#5aad5a' },
          { key: 'grace', label: 'Grace [-]', count: map['-'], color: '#f9e2af' },
          { key: 'failedTwice', label: 'Failed [--]', count: map['--'], color: '#f38ba8' },
          { key: 'skipped', label: 'Skipped [+]', count: map['+'], color: '#6c7086' },
          { key: 'pending', label: 'Pending [ ]', count: map[' '], color: '#89b4fa' },
        ],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/obsidian/tasks', (req, res) => {
    try {
      const db = getDb();
      const date = req.query.date;
      let rows;
      if (date) {
        rows = db.prepare('SELECT * FROM tasks WHERE obsidian_sync = 1 AND due_date = ? ORDER BY created_at DESC').all(date);
      } else {
        rows = db.prepare('SELECT * FROM tasks WHERE obsidian_sync = 1 ORDER BY created_at DESC').all();
      }
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/obsidian/sync', (req, res) => {
    try {
      obsidianService.syncAll();
      res.json({ success: true, message: 'Obsidian sync triggered' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/obsidian/batch', (req, res) => {
    try {
      const db = getDb();
      const { tasks } = req.body;
      if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks array required' });
      const now = Math.floor(Date.now() / 1000);
      const upsert = db.prepare(`
        INSERT INTO tasks (id, title, marker, source_file, source_path, due_date, status, obsidian_sync, created_at, completed_at, failed_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title, marker=excluded.marker, due_date=excluded.due_date,
          status=excluded.status, completed_at=excluded.completed_at, failed_count=excluded.failed_count
      `);
      let synced = 0;
      for (const task of tasks) {
        if (!task.title) continue;
        const row = db.prepare('SELECT id FROM tasks WHERE title = ? AND source_path = ?').get(task.title, task.source_path || null);
        const id = row ? row.id : crypto.randomUUID();
        const completedAt = task.marker === 'x' || task.marker === 'x2' || task.marker === 'x3' ? now : null;
        const status = completedAt ? 'completed' : 'pending';
        const failedCount = task.failed_count || (
          task.marker === 'x2' ? 1 : task.marker === 'x3' ? 2 : task.marker === '--' ? 2 : task.marker === '-' ? 1 : 0
        );
        upsert.run(id, task.title, task.marker || ' ', task.source_file || null, task.source_path || null, task.due_date || null, status, now, completedAt, failedCount);
        synced++;
      }
      res.json({ success: true, synced });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/obsidian/config', (req, res) => {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT * FROM settings WHERE key IN ('obsidian_vault_path', 'theme')").all();
      const config = {};
      for (const row of rows) config[row.key] = row.value;
      config.markers_supported = [' ', '-', '--', '+', 'x', 'x2', 'x3'];
      config.marker_labels = {
        ' ': 'Pending',
        '-': 'Grace (x1)',
        '--': 'Failed Twice (x2)',
        '+': 'Skipped',
        'x': 'Done Day 1',
        'x2': 'Done Day 2',
        'x3': 'Done Day 3',
      };
      res.json(config);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Pomodoro ───────────────────────────────────────
  router.get('/pomodoro', (req, res) => {
    try {
      res.json(pomodoroService.getState());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/pomodoro/start', (req, res) => {
    try {
      pomodoroService.start();
      res.json(pomodoroService.getState());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/pomodoro/pause', (req, res) => {
    try {
      pomodoroService.pause();
      res.json(pomodoroService.getState());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/pomodoro/reset', (req, res) => {
    try {
      pomodoroService.reset();
      res.json(pomodoroService.getState());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/pomodoro/settings', (req, res) => {
    try {
      const { work_minutes, break_minutes } = req.body;
      pomodoroService.updateSettings(work_minutes || 25, break_minutes || 5);
      res.json(pomodoroService.getState());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Water ──────────────────────────────────────────
  router.get('/water', (req, res) => {
    try {
      const settings = waterService.getSettings();
      const todayTotal = waterService.getTodayTotal();
      res.json({ settings, today_total: todayTotal });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/water/log', (req, res) => {
    try {
      const amountMl = req.body.amount_ml || 250;
      const result = waterService.logWater(amountMl, req.body.channel || null);
      const todayTotal = waterService.getTodayTotal();
      res.json({ ...result, today_total: todayTotal });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/water/settings', (req, res) => {
    try {
      const db = getDb();
      const { daily_goal_ml, interval_minutes, enabled, start_hour, end_hour, reminder_channel } = req.body;
      const settings = {};
      if (daily_goal_ml !== undefined) settings.daily_goal_ml = daily_goal_ml;
      if (interval_minutes !== undefined) settings.interval_minutes = interval_minutes;
      if (enabled !== undefined) settings.enabled = enabled ? 1 : 0;
      if (start_hour !== undefined) settings.start_hour = start_hour;
      if (end_hour !== undefined) settings.end_hour = end_hour;
      if (reminder_channel !== undefined) settings.reminder_channel = reminder_channel;

      const sets = Object.keys(settings).map(k => `${k} = ?`).join(', ');
      const values = Object.values(settings);
      values.push('default');
      db.prepare(`UPDATE water_settings SET ${sets} WHERE user_id = ?`).run(...values);
      res.json(waterService.getSettings());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Water History ───────────────────────────────
  router.get('/water/history', (req, res) => {
    try {
      const db = getDb();
      const startOfDay = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime() / 1000);
      const rows = db.prepare('SELECT * FROM water_log WHERE logged_at >= ? ORDER BY logged_at DESC').all(startOfDay);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Pomodoro History ───────────────────────────
  router.get('/pomodoro/history', (req, res) => {
    try {
      const db = getDb();
      const startOfDay = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime() / 1000);
      const rows = db.prepare('SELECT * FROM pomodoro_sessions WHERE started_at >= ? ORDER BY started_at DESC').all(startOfDay);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/pomodoro/session', (req, res) => {
    try {
      const db = getDb();
      const { type, completed } = req.body;
      const id = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      db.prepare('INSERT INTO pomodoro_sessions (id, state, started_at) VALUES (?, ?, ?)')
        .run(id, type === 'work' ? 'completed' : 'break_done', now);
      res.json({ id, type, completed: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Channel test ───────────────────────────────
  router.post('/channels/:channel/test', async (req, res) => {
    try {
      const { channel } = req.params;
      const notificationService = (await import('../services/notifications.js')).NotificationService;
      const ns = new notificationService();
      await ns.send('Test Notification', 'This is a test from Mnemonic', { channel, config: {} });
      res.json({ success: true, message: `Test sent via ${channel}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Channels ───────────────────────────────────────
  router.get('/channels', (req, res) => {
    try {
      const db = getDb();
      const channels = db.prepare('SELECT * FROM channel_config').all();
      res.json(channels);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/channels/:channel', (req, res) => {
    try {
      const db = getDb();
      const { channel } = req.params;
      const { enabled, config } = req.body;
      const row = db.prepare('SELECT * FROM channel_config WHERE channel = ?').get(channel);
      if (!row) return res.status(404).json({ error: 'Channel not found' });
      if (enabled !== undefined) {
        db.prepare('UPDATE channel_config SET enabled = ? WHERE channel = ?').run(enabled ? 1 : 0, channel);
      }
      if (config !== undefined) {
        db.prepare('UPDATE channel_config SET config = ? WHERE channel = ?').run(JSON.stringify(config), channel);
      }
      const updated = db.prepare('SELECT * FROM channel_config WHERE channel = ?').get(channel);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Settings ─────────────────────────────────────
  router.get('/settings', (req, res) => {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM settings').all();
      const settings = {};
      for (const row of rows) settings[row.key] = row.value;
      res.json(settings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/settings/:key', (req, res) => {
    try {
      const db = getDb();
      const { key } = req.params;
      const { value } = req.body;
      if (value === null || value === undefined) {
        db.prepare('DELETE FROM settings WHERE key = ?').run(key);
      } else {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
          .run(key, String(value));
      }
      if (key === 'obsidian_vault_path' && obsidianService) {
        obsidianService.restartWatcher();
      }
      res.json({ key, value: value === null ? null : String(value) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Stats ──────────────────────────────────────────
  router.get('/stats', (req, res) => {
    try {
      const db = getDb();
      const startOfDay = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime() / 1000);

      const activeReminders = db.prepare('SELECT COUNT(*) as count FROM reminders WHERE status = ?').get('active');
      const tasksToday = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE due_date = ?').get(
        `${String(new Date().getDate()).padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()]}`
      );
      const completedToday = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE completed_at >= ?').get(startOfDay);
      const pomodorosToday = db.prepare('SELECT COUNT(*) as count FROM pomodoro_sessions WHERE started_at >= ?').get(startOfDay);
      const waterToday = db.prepare('SELECT COALESCE(SUM(amount_ml), 0) as total FROM water_log WHERE logged_at >= ?').get(startOfDay);

      const tasksTodayFormatted = `${String(new Date().getDate()).padStart(2, '0')}-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()]}`;

      res.json({
        active_reminders: activeReminders ? activeReminders.count : 0,
        tasks_today: tasksToday ? tasksToday.count : 0,
        completed_today: completedToday ? completedToday.count : 0,
        pomodoros_today: pomodorosToday ? pomodorosToday.count : 0,
        water_today: waterToday ? waterToday.total : 0,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
