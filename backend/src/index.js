import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { getDb, closeDb } from './db.js';
import { NotificationService, setWsServer } from './services/notifications.js';
import { ReminderService } from './services/reminders.js';
import { PomodoroService } from './services/pomodoro.js';
import { WaterService } from './services/water.js';
import { ObsidianService } from './services/obsidian.js';
import { Scheduler } from './scheduler/index.js';
import { createRouter } from './api/server.js';

// Initialize DB
const db = getDb();
console.log('[main] Database initialized');

// Services
const notificationService = new NotificationService();
const reminderService = new ReminderService(notificationService);
const pomodoroService = new PomodoroService(notificationService);
const waterService = new WaterService(notificationService);
const obsidianService = new ObsidianService();

// Express app
const app = express();
const router = createRouter(reminderService, pomodoroService, waterService, obsidianService);
app.use('/api', router);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// HTTP server
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '3001', 10);

// WebSocket server
const wsPort = parseInt(process.env.WS_PORT || '3002', 10);

if (wsPort === PORT) {
  // WS on same HTTP server
  const wss = new WebSocketServer({ server });
  setWsServer(wss);
  console.log('[main] WebSocket on same port', PORT);

  wss.on('connection', (ws) => {
    console.log('[ws] Client connected');
    ws.on('close', () => console.log('[ws] Client disconnected'));
    ws.on('error', (err) => console.error('[ws] Error:', err.message));
  });
} else {
  // WS on separate port
  const wss = new WebSocketServer({ port: wsPort });
  setWsServer(wss);
  console.log('[main] WebSocket server on port', wsPort);

  wss.on('connection', (ws) => {
    console.log('[ws] Client connected');
    ws.on('close', () => console.log('[ws] Client disconnected'));
    ws.on('error', (err) => console.error('[ws] Error:', err.message));
  });
}

// Start services
reminderService.start(30000);
obsidianService.start();

// Start scheduler
const scheduler = new Scheduler(reminderService, waterService, obsidianService);
scheduler.start();

// Listen
server.listen(PORT, () => {
  console.log(`[main] Mnemonic backend listening on port ${PORT}`);
  console.log(`[main] API: http://localhost:${PORT}/api`);
  console.log(`[main] WS: ws://localhost:${wsPort}`);
  console.log('[main] Configure channels via Settings → Channels in the UI');
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[main] Received ${signal}, shutting down...`);
  reminderService.stop();
  obsidianService.stop();
  scheduler.stop();
  closeDb();
  server.close(() => {
    console.log('[main] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[main] Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
