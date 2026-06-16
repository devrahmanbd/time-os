import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let db = null;

export function getDb() {
  if (db) return db;
  const dbPath = process.env.DB_PATH || './data/mnemonic.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables();
  migrateSchema();
  seedDefaults();
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_at INTEGER NOT NULL,
      repeat TEXT DEFAULT 'none',
      channel TEXT DEFAULT 'all',
      channel_config TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      source TEXT DEFAULT 'manual'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      marker TEXT DEFAULT ' ',
      source_file TEXT,
      source_path TEXT,
      tag TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending',
      obsidian_sync INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      failed_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      work_minutes INTEGER DEFAULT 25,
      break_minutes INTEGER DEFAULT 5,
      completed_pomodoros INTEGER DEFAULT 0,
      state TEXT DEFAULT 'idle',
      started_at INTEGER,
      channel TEXT DEFAULT 'all'
    );

    CREATE TABLE IF NOT EXISTS water_log (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      amount_ml INTEGER DEFAULT 250,
      logged_at INTEGER NOT NULL,
      channel TEXT
    );

    CREATE TABLE IF NOT EXISTS water_settings (
      user_id TEXT PRIMARY KEY DEFAULT 'default',
      daily_goal_ml INTEGER DEFAULT 2000,
      interval_minutes INTEGER DEFAULT 30,
      enabled INTEGER DEFAULT 1,
      reminder_channel TEXT DEFAULT 'all',
      start_hour INTEGER DEFAULT 8,
      end_hour INTEGER DEFAULT 22
    );

    CREATE TABLE IF NOT EXISTS notification_log (
      id TEXT PRIMARY KEY,
      reminder_id TEXT,
      channel TEXT,
      sent_at INTEGER NOT NULL,
      status TEXT DEFAULT 'sent',
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS channel_config (
      channel TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      config TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function migrateSchema() {
  try { db.exec('ALTER TABLE tasks ADD COLUMN tag TEXT'); } catch {}
}

function seedDefaults() {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM water_settings').get();
  if (existing.cnt === 0) {
    db.prepare(`
      INSERT INTO water_settings (user_id, daily_goal_ml, interval_minutes, enabled, reminder_channel, start_hour, end_hour)
      VALUES ('default', 2000, 30, 1, 'all', 8, 22)
    `).run();
  }

  const channels = ['telegram', 'signal', 'sip'];
  for (const ch of channels) {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM channel_config WHERE channel = ?').get(ch);
    if (row.cnt === 0) {
      db.prepare('INSERT INTO channel_config (channel, enabled, config) VALUES (?, 1, ?)').run(ch, '{}');
    }
  }
}
