# Mnemonic — User Guide

Mnemonic is a self-hosted task management system with Obsidian sync, reminders, pomodoro timer, water tracker, and multi-channel notifications. This guide covers both the **web app** and the **Obsidian plugin**.

---

## Quick Start

```sh
# Start backend
cd backend && PORT=4001 WS_PORT=4002 node src/index.js

# Start frontend (separate terminal)
cd frontend && npx vite --port 4000 --host
```

Open `http://localhost:4000` in your browser.

---

## Web App Tabs

### Dashboard
- **Header**: Live clock, greeting, weather, stats pills (reminders, tasks, done, water, pomo)
- **Collection Cards**: CRUD cards saved to localStorage
- **Today's Tasks**: Full marker lifecycle list with click-to-complete and Move Uncompleted button
- **Task Chart**: 7-series bar chart — Done [x], Done [x2], Done [x3], Grace [-], Failed [--], Skipped [+], Pending [ ]
- **Goal Calendar**: Monthly calendar view
- **Pomodoro**: Start/pause/reset with timer display
- **Habits**: 7-day grid with bio bar
- **Water**: Daily goal progress with log button

### Tasks
- Date-filtered table view of all tasks
- Inline marker selector dropdown (all 8 markers)
- Delete tasks
- Add new tasks
- Sync from Obsidian button
- **Lifecycle bar**: Shows current counts for all 7 active marker types

### Pomodoro
- Full timer page with start/pause/reset
- Settings: work duration, break duration
- Session history

### Water
- Daily log with +250ml button
- Settings: daily goal, interval, active hours, channel
- History view

### Channels
- Configure Telegram, Signal, SIP credentials
- Toggle enabled/disabled per channel
- Test button per channel

### Settings
- Obsidian vault path
- Backend URL
- Theme toggle (dark/light)
- Sync now button

---

## Marker System

Mnemonic uses an 8-marker lifecycle to track task progress across days:

| Marker | Meaning | Failed Count | Chart Series | Color |
|--------|---------|-------------|--------------|-------|
| `[ ]` | Pending — not started | 0 | Pending | Cyan |
| `[-]` | Grace — failed once (day 1 carryover) | 1 | Grace | Yellow |
| `[--]` | Failed twice (day 2 carryover) | 2 | Failed | Red |
| `[+]` | Skipped — task not needed | 0 | Skipped | Gray |
| `[x]` | Done Day 1 — completed same day | 0 | Done | Light green |
| `[x2]` | Done Day 2 — completed after 1 fail | 1 | Done | Medium green |
| `[x3]` | Done Day 3 — completed after 2 fails | 2 | Done | Dark green |

### How the lifecycle works

**Move Uncompleted** button advances tasks one step each day:
```
Day 1: [ ] → Move → [-]  (failed once, grace period)
Day 2: [-] → Move → [--] (failed twice)
Day 3: [--] → Move → [--] (stays — no more auto-advances)
```

**Click-to-complete** on a task card sets the appropriate done marker:
```
[ ] click → [x]   (done same day)
[-] click → [x2]  (done day 2)
[--] click → [x3] (done day 3)
[+] click → [ ]   (reopen skipped)
[x]/[x2]/[x3] click → [ ] (reopen)
```

**Failed Twice** (`[--]`) and **Skipped** (`[+]`) tasks are **not eligible** for Move Uncompleted — they stay unchanged.

### Chart

The distribution chart shows 7 series:
- **Done [x]** (light green `#a6e3a1`)
- **Done [x2]** (medium green `#7ec87e`)
- **Done [x3]** (dark green `#5aad5a`)
- **Grace [-]** (yellow `#f9e2af`)
- **Failed [--]** (red `#f38ba8`)
- **Skipped [+]** (gray `#6c7086`)
- **Pending [ ]** (cyan `#89b4fa`)

All three done markers count toward the progress bar at the top.

---

## Obsidian Plugin

### Installation

1. Copy `obsidian-plugin/` to your vault: `.obsidian/plugins/mnemonic-sync/`
2. In Obsidian: **Settings → Community Plugins → Installed plugins**
3. Enable **Mnemonic Sync**
4. Configure backend URL in **Settings → Mnemonic Sync** (default: `http://localhost:4001`)

### Commands

Open Command Palette (`Ctrl+P`) and search for "Mnemonic":

| Command | Action |
|---------|--------|
| Open Mnemonic view | Toggle sidebar panel |
| Sync tasks with Mnemonic | Manual sync trigger |
| Create reminder | Prompt for title, creates 1-hour reminder |
| Log water (+250ml) | Logs 250ml water consumption |
| Start pomodoro | Starts 25-min work session |
| Stop pomodoro | Pauses current session |
| Send current note as reminder | Sends active note title + content as reminder |

### Ribbon Icon

Click the clock icon in the left ribbon to open/close the Mnemonic sidebar.

### Sidebar View

The sidebar shows:
- **Connection status**: Green/red indicator dot + task count
- **Marker stats**: All/ Done/ Grace/ Failed/ Skip/ Pending counts
- **Mini bar chart**: Inline colored segments showing marker distribution
- **Today's tasks**: List with icons per marker type
- **Water progress**: Goal bar
- **Pomodoro**: Current session state + remaining time
- **Quick actions**: Buttons for Reminder, Water, Pomo Start/Stop, Sync

### Auto-Sync

The plugin automatically syncs files from `Task-List/*.md` in your vault to the Mnemonic backend. Sync interval is configurable in settings (default: 60 seconds).

Task files must follow the naming pattern: `{DD}-{Mon}.md` (e.g., `16-Jun.md`).

Each line in the file should be a task:
```
- [ ] Review project proposal
- [x] Write unit tests
- [-] Update dependencies
- [--] Fix login bug
- [+] Deploy to staging
- [x2] Refactor auth module
- [x3] Setup monitoring
```

---

## Task File Format

Obsidian `Task-List/*.md` files use this format:

```markdown
- [ ] Pending task
- [-] Grace — failed once
- [--] Failed twice
- [+] Skipped/not needed
- [x] Done same day
- [x2] Done day 2 (after grace)
- [x3] Done day 3 (after failing twice)
```

The file name determines the due date:
- `16-Jun.md` → tasks due on 16-Jun
- `27-Dec.md` → tasks due on 27-Dec

---

## API Reference (for the plugin)

The plugin communicates with the backend via these endpoints:

### Health
```http
GET /api/obsidian/health
```
Returns server status, version, uptime, task/reminder counts, watcher state.

### Marker Distribution
```http
GET /api/obsidian/markers?date=16-Jun
```
Returns all 7 marker counts for a given date with chart-ready series data.

### Tasks
```http
GET /api/tasks?date=16-Jun       # List tasks for a date
POST /api/tasks                   # Create single task
PATCH /api/tasks/:id              # Update marker, status, failed_count
```

### Batch Sync
```http
POST /api/obsidian/batch
Content-Type: application/json

{
  "tasks": [
    { "title": "...", "marker": "x", "due_date": "16-Jun", "source_file": "16-Jun.md" }
  ]
}
```
Bulk upsert — creates or updates tasks in one request. Returns `{ success, synced }`.

### Plugin Config
```http
GET /api/obsidian/config
```
Returns supported markers list, labels, vault path, theme.

---

## Self-Hosted Setup

### Requirements
- Node.js 18+
- SQLite (included via better-sqlite3)

### Ports
| Service | Port |
|---------|------|
| Frontend (Vite) | 4000 |
| Backend API (Express) | 4001 |
| WebSocket | 4002 |

### Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 4001 | Backend HTTP port |
| `WS_PORT` | 4002 | WebSocket server port |
| `DB_PATH` | `./data/mnemonic.db` | SQLite database path |

### Database
SQLite database auto-created at `backend/data/mnemonic.db` with 8 tables:
- `reminders` — scheduled reminders with repeat
- `tasks` — full marker lifecycle tasks
- `pomodoro_sessions` — work/break tracking
- `water_log` — consumption entries
- `water_settings` — goals and schedule
- `channel_config` — Telegram/Signal/SIP credentials
- `notification_log` — delivery history
- `settings` — key-value config

---

## Troubleshooting

### "Backend offline" in the web app
- Ensure backend is running: `node src/index.js` from the `backend/` directory
- Check port 4001 is not in use: `lsof -i :4001`
- Frontend proxies `/api` to `localhost:4001` via Vite config

### "Vault path not configured" in backend logs
- Go to Settings page in the web app
- Set the absolute path to your Obsidian vault
- The watcher will restart automatically

### Plugin shows "Backend offline"
- Check backend URL in Obsidian plugin settings (default: `http://localhost:4001`)
- Run `curl http://localhost:4001/api/obsidian/health` to test connectivity
- If using HTTPS, ensure the backend supports it

### Tasks not syncing from Obsidian
- Verify files are in `Task-List/` folder in vault root
- File name must match pattern `DD-Mon.md` (e.g., `16-Jun.md`)
- Check the sync interval setting (default 60s) or trigger manual sync
- Check backend logs for parse errors

### Marker not appearing correctly
- Supported markers: ` `, `-`, `--`, `+`, `x`, `x2`, `x3`
- Obsidian plugin regex: `/^- \[([ \-\+x]{1,2}x?)\]\s*(.+)/`
- Ensure no extra spaces inside brackets: `[x2]` not `[ x2 ]`

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Obsidian   │────▶│  Mnemonic    │◀────│  Web App    │
│  Plugin     │     │  Backend     │     │  (React)    │
│  (sidebar)  │     │  Express     │     │  :4000      │
│  :4001 API  │     │  :4001       │     │             │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │   SQLite DB   │
                    │  mnemonic.db  │
                    └──────────────┘
```

- Obsidian plugin reads `Task-List/*.md` files and sends them via batch API
- Web app provides the full dashboard UI
- Backend stores everything in SQLite and runs scheduled services
- WebSocket handles real-time updates for the frontend
- Notification service dispatches reminders via Telegram/Signal/SIP
