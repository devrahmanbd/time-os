import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { getDb } from '../db.js';
import crypto from 'node:crypto';

export class ObsidianService {
  constructor() {
    this.watcher = null;
    this.taskDir = null;
  }

  getVaultPath() {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'obsidian_vault_path'").get();
    return row ? row.value : null;
  }

  start() {
    this.restartWatcher();
  }

  restartWatcher() {
    if (this.watcher) { this.watcher.close(); this.watcher = null; }
    const vaultPath = this.getVaultPath();
    if (!vaultPath || !fs.existsSync(vaultPath)) {
      console.warn('[obsidian] Vault path not configured or does not exist:', vaultPath);
      return;
    }
    this.taskDir = path.join(vaultPath, 'Task-List');
    if (!fs.existsSync(this.taskDir)) {
      console.warn('[obsidian] Task-List directory does not exist:', this.taskDir);
      return;
    }
    this.watcher = chokidar.watch(path.join(this.taskDir, '*.md'), {
      persistent: true,
      ignoreInitial: false,
    });
    this.watcher.on('add', (filePath) => this.handleFileChange(filePath));
    this.watcher.on('change', (filePath) => this.handleFileChange(filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileDelete(filePath));
    console.log('[obsidian] Watcher started on:', this.taskDir);
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[obsidian] Watcher stopped');
    }
  }

  handleFileChange(filePath) {
    try {
      const tasks = this.parseTaskFile(filePath);
      const db = getDb();
      const filename = path.basename(filePath);
      const dueDate = this.extractDate(filename);

      const existingStmt = db.prepare('SELECT id, marker FROM tasks WHERE source_path = ?');
      const upsertStmt = db.prepare(`
        INSERT INTO tasks (id, title, marker, source_file, source_path, due_date, status, obsidian_sync, created_at, completed_at, failed_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, marker=excluded.marker, due_date=excluded.due_date, status=excluded.status, completed_at=excluded.completed_at
      `);
      const now = Math.floor(Date.now() / 1000);

      const existingRows = existingStmt.all(filePath);
      const existingMap = new Map(existingRows.map(r => [r.id, r]));

      const seen = new Set();
      for (const task of tasks) {
        seen.add(task.text);
        const row = db.prepare('SELECT id FROM tasks WHERE title = ? AND source_path = ?').get(task.text, filePath);
        const id = row ? row.id : crypto.randomUUID();
        const completedAt = task.marker === 'x' ? now : null;
        const status = task.marker === 'x' ? 'completed' : 'pending';
        upsertStmt.run(id, task.text, task.marker, filename, filePath, dueDate, status, now, completedAt);
      }

      for (const [id, row] of existingMap) {
        const task = tasks.find(t => t.text === row.title);
        if (!task) {
          db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        }
      }
    } catch (err) {
      console.error('[obsidian] Error handling file change:', filePath, err);
    }
  }

  handleFileDelete(filePath) {
    try {
      const db = getDb();
      db.prepare('DELETE FROM tasks WHERE source_path = ?').run(filePath);
      console.log('[obsidian] Deleted tasks for removed file:', filePath);
    } catch (err) {
      console.error('[obsidian] Error handling file delete:', filePath, err);
    }
  }

  parseTaskFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const tasks = [];
    const taskRegex = /^- \[([ \-\+x]{1,2}x?)\]\s*(.+)/;
    for (const line of lines) {
      const match = line.match(taskRegex);
      if (match) {
        tasks.push({
          marker: match[1].trim(),
          text: match[2].trim(),
          file: path.basename(filePath),
        });
      }
    }
    return tasks;
  }

  extractDate(filename) {
    const match = filename.match(/^(\d{1,2}-[A-Za-z]{3})\.md$/);
    return match ? match[1] : null;
  }

  syncAll() {
    this.restartWatcher();
    if (!this.taskDir || !fs.existsSync(this.taskDir)) {
      console.warn('[obsidian] Cannot sync: Task-List directory not found');
      return;
    }
    const files = fs.readdirSync(this.taskDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      this.handleFileChange(path.join(this.taskDir, file));
    }
    console.log('[obsidian] Full sync completed, files:', files.length);
  }
}
