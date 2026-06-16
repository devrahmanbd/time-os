# Mnemonic

Self-hosted task management with Obsidian sync, pomodoro timer, water tracker, reminders, and multi-channel notifications (Telegram/Signal/SIP).

## Quick Start

```sh
# Backend
cd backend && PORT=4001 WS_PORT=4002 node src/index.js

# Frontend (separate terminal)
cd frontend && npx vite --port 4000 --host
```

Open `http://localhost:4000`.

## Marker Lifecycle

8 markers track task progress across days:

`[ ]` → `[-]` → `[--]`  |  `[+]` skipped  |  `[x]` `[x2]` `[x3]` done

| Marker | Meaning |
|--------|---------|
| `[ ]` | Pending |
| `[-]` | Grace (failed once) |
| `[--]` | Failed twice |
| `[+]` | Skipped/unnecessary |
| `[x]` | Done Day 1 |
| `[x2]` | Done Day 2 |
| `[x3]` | Done Day 3 |

**Move Uncompleted** advances: `[ ]` → `[-]` → `[--]` (stops). `[+]` and done markers are skipped.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Plugin**: Obsidian (sidebar view, auto-sync, commands)
- **Channels**: Telegram (grammy), Signal (REST), SIP (Twilio TTS)

## Repo

```
├── backend/          Express API + SQLite + services
│   └── src/
│       ├── api/        REST routes
│       ├── services/   reminders, obsidian, pomodoro, water, notifications
│       └── bots/       telegram, signal
├── frontend/         React SPA (Vite + Tailwind)
│   └── src/
│       ├── components/  Dashboard, TaskChart, PomodoroWidget, etc.
│       └── pages/       Tasks, Pomodoro, Water, Channels, Settings
├── obsidian-plugin/  Sidebar view + auto-sync + commands
└── docs/
    └── USAGE.md        Full user guide
```

## Docs

Full user guide: [`docs/USAGE.md`](docs/USAGE.md) — covers web app, plugin installation, marker system, API reference, troubleshooting.
