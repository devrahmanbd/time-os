# Mnemonic — Project Overview

Self-hosted task management system with Obsidian sync, pomodoro timer, water tracker, reminders, and multi-channel notifications. Built with Node.js + Express + SQLite (backend) and React + Vite + Tailwind (frontend).

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Obsidian   │────▶│   Mnemonic       │◀────│  Web App     │
│   Plugin     │     │   Backend        │     │  (React)     │
│   (sidebar)  │     │   Express :4001  │     │  Vite :4000  │
└──────────────┘     └───────┬──────────┘     └──────────────┘
                             │
                    ┌────────┴────────┐
                    │    SQLite DB     │
                    │  mnemonic.db     │
                    └─────────────────┘
```

- **Frontend**: React 18, Vite 6, Tailwind CSS 3, Lucide React icons
- **Backend**: Express 4, better-sqlite3 11, ws 8, node-cron 3
- **Plugin**: Obsidian v0.15+, sidebar view, batch sync, 7 commands
- **Channels**: Telegram (grammy), Signal (REST API), SIP calls (Twilio)

### Ports
| Service | Port |
|---------|------|
| Frontend Dev Server | `:4000` |
| Backend API | `:4001` |
| WebSocket | `:4002` |

---

## File Inventory

### Backend (`backend/`)
```
backend/
├── package.json
├── src/
│   ├── index.js              Entry point — Express server, WS, service init, graceful shutdown
│   ├── db.js                 SQLite schema (8 tables), WAL mode, auto-migration, seed defaults
│   ├── api/
│   │   └── server.js         19+ REST routes for tasks, reminders, pomodoro, water, channels, settings, stats, obsidian
│   ├── services/
│   │   ├── reminders.js      CRUD + repeat engine (hourly/daily/weekly/monthly) + due checker (30s interval)
│   │   ├── notifications.js  Multi-channel dispatcher — Telegram, Signal, SIP/WebSocket, fallback strategy
│   │   ├── obsidian.js       Chokidar watcher on Task-List/*.md, parses task lines, upserts to DB
│   │   ├── pomodoro.js       Server-side timer state machine (idle → running → paused → completed)
│   │   ├── water.js          Daily goal tracking, interval-based logging, start/end hour scheduling
│   │   └── sip.js            Twilio TTS call dispatcher for phone notifications
│   ├── bots/
│   │   ├── telegram.js       Grammy bot handler — receives commands, creates reminders
│   │   └── signal.js         Signal REST client — sends messages via Signal CLI
│   └── scheduler/
│       └── index.js          Cron scheduler for water reminders, obsidian sync, periodic checks
```

### Frontend (`frontend/`)
```
frontend/
├── package.json
├── vite.config.js            Dev server :4000, proxy /api → :4001
├── tailwind.config.js        Dark/light mode, custom color tokens (accent, surface, muted)
├── postcss.config.js
├── index.html
├── src/
│   ├── main.jsx              React entry point
│   ├── App.jsx               6-tab navigation: Dashboard, Tasks, Pomodoro, Water, Channels, Settings
│   ├── index.css             Tailwind directives + glass UI, card/btn/modal/progress classes
│   ├── api.js                Fetch wrapper with error handling, JSON parsing, relative /api base
│   ├── components/
│   │   ├── Dashboard.jsx         2-column grid layout composing all widgets
│   │   ├── DashboardHeader.jsx    Live clock, greeting, weather, stats pills (5 metrics)
│   │   ├── CollectionCards.jsx   CRUD cards persisted to localStorage
│   │   ├── TodayTasks.jsx        8-marker lifecycle, click-to-complete, Move Uncompleted, progress bar
│   │   ├── TaskChart.jsx         7-series SVG bar chart with Day/Week/Month/All filters
│   │   ├── GoalCalendar.jsx     Monthly calendar with streak display
│   │   ├── PomodoroWidget.jsx   Timer display, start/pause/reset, session count
│   │   ├── HabitsWidget.jsx     7-day grid with bio bar, streak tracking
│   │   └── WaterWidget.jsx      Daily goal progress + log button
│   └── pages/
│       ├── TasksPage.jsx     Full-page task table, date filter, add/delete, marker dropdown, lifecycle stats card
│       ├── PomodoroPage.jsx  Full timer with settings (work/break minutes), session history
│       ├── WaterPage.jsx     Daily log, history, settings (goal, interval, hours, channel)
│       ├── ChannelsPage.jsx  Telegram/Signal/SIP config with toggles, field inputs, test button
│       └── SettingsPage.jsx  Obsidian vault path, backend URL, JWT secret, theme toggle, sync button
```

### Obsidian Plugin (`obsidian-plugin/`)
```
obsidian-plugin/
├── manifest.json            Plugin metadata (id: mnemonic-sync, minAppVersion: 0.15.0)
├── main.js                  Sidebar view, 7 commands, auto-sync, settings tab, batch sync
├── styles.css               Mnemonic-themed sidebar styles
└── README.md                Quick reference card
```

### Docs
```
docs/
└── USAGE.md                 Full user guide — web app, plugin, marker system, API reference, troubleshooting
```

---

## Marker System

8 markers track task progress across days:

| Marker | Meaning | failed_count | Chart Color | Lifecycle Position |
|--------|---------|-------------|-------------|--------------------|
| `[ ]` | Pending — not started | 0 | `#89b4fa` Cyan | Start |
| `[-]` | Grace — failed once | 1 | `#f9e2af` Yellow | After Move 1 |
| `[--]` | Failed twice | 2 | `#f38ba8` Red | After Move 2 |
| `[+]` | Skipped — not needed | 0 | `#6c7086` Gray | Manual skip |
| `[x]` | Done Day 1 | 0 | `#a6e3a1` Lt Green | Click-complete `[ ]` |
| `[x2]` | Done Day 2 | 1 | `#7ec87e` Md Green | Click-complete `[-]` |
| `[x3]` | Done Day 3 | 2 | `#5aad5a` Dk Green | Click-complete `[--]` |

### Lifecycle rules

**Move Uncompleted** (advances all uncompleted one step):
```
[ ] → [-]  →  [--] → [--]   (stays — no infinite fail loop)
[+] → [+]  (skipped)
[x]/[x2]/[x3] → unchanged (skipped)
```

**Click-to-complete** (click marker on task card):
```
[ ]  click → [x]    (completed same day)
[-]  click → [x2]   (completed after grace period)
[--] click → [x3]   (completed after failing twice)
[+]  click → [ ]    (reopen skipped task)
[x]/[x2]/[x3] click → [ ] (reopen)
```

**3rd-day close**: a `[--]` task closed to `[x3]` counts as Done Day 3 in the chart, not as Failed. No double-counting.

---

## Database Schema (8 tables)

### `tasks`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | TEXT PK | UUID | |
| title | TEXT | required | |
| marker | TEXT | `' '` | One of `' '`, `-`, `--`, `+`, `x`, `x2`, `x3` |
| source_file | TEXT | null | Filename from Obsidian |
| source_path | TEXT | null | Full vault path |
| tag | TEXT | null | Category label |
| due_date | TEXT | null | `DD-Mon` format (e.g. `16-Jun`) |
| status | TEXT | `'pending'` | `pending` or `completed` |
| obsidian_sync | INTEGER | 1 | Boolean flag |
| created_at | INTEGER | now | Unix timestamp |
| completed_at | INTEGER | null | Unix timestamp |
| failed_count | INTEGER | 0 | 0/1/2 tracking |

### `reminders`
Scheduled reminders with repeat engine: `due_at` (unix ts), `repeat` (none/hourly/daily/weekly/monthly), `channel` (all/telegram/signal/sip), `channel_config` (JSON), `status` (active/deleted/completed).

### `pomodoro_sessions`
Tracks work sessions: `state` (idle/running/paused/completed), `work_minutes`/`break_minutes`, `completed_pomodoros`.

### `water_log`
Consumption entries: `amount_ml`, `logged_at`, `channel`.

### `water_settings`
Per-user config: `daily_goal_ml` (2000), `interval_minutes` (30), `enabled`, `start_hour`/`end_hour`, `reminder_channel`.

### `notification_log`
Delivery audit: `reminder_id`, `channel`, `sent_at`, `status`, `error`.

### `channel_config`
Channel credentials stored as JSON in `config` column: Telegram bot token, Signal number, SIP credentials.

### `settings`
Key-value store: `obsidian_vault_path`, `theme`, `backend_url`, `jwt_secret`.

---

## API Endpoints

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks?date=X` | List tasks (sorted by lifecycle order) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update marker, status, failed_count |
| DELETE | `/api/tasks/:id` | Delete task |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders?status=X` | List reminders |
| POST | `/api/reminders` | Create reminder |
| PATCH | `/api/reminders/:id` | Update reminder |
| DELETE | `/api/reminders/:id` | Soft delete |
| POST | `/api/reminders/:id/complete` | Mark completed |

### Pomodoro
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pomodoro` | Get state |
| POST | `/api/pomodoro/start` | Start timer |
| POST | `/api/pomodoro/pause` | Pause timer |
| POST | `/api/pomodoro/reset` | Reset timer |
| PUT | `/api/pomodoro/settings` | Update work/break |
| GET | `/api/pomodoro/history` | Today's sessions |
| POST | `/api/pomodoro/session` | Log session |

### Water
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/water` | Settings + today total |
| POST | `/api/water/log` | Log consumption |
| PUT | `/api/water/settings` | Update goal/interval/hours |
| GET | `/api/water/history` | Today's entries |

### Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | List configs |
| PUT | `/api/channels/:channel` | Update enabled/config |
| POST | `/api/channels/:channel/test` | Send test notification |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | All settings |
| PUT | `/api/settings/:key` | Set/delete setting |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard metrics |

### Obsidian Plugin API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/obsidian/health` | Server status + version + watcher state |
| GET | `/api/obsidian/markers?date=X` | Full 7-series marker distribution |
| GET | `/api/obsidian/tasks?date=X` | Synced tasks |
| POST | `/api/obsidian/sync` | Trigger vault re-sync |
| POST | `/api/obsidian/batch` | Bulk upsert tasks (single request) |
| GET | `/api/obsidian/config` | Supported markers, labels, vault path |

---

## Services Architecture

### Reminder Service
- CRUD operations on `reminders` table
- Repeat engine: computes next `due_at` from cron-like config (hourly/daily/weekly/monthly)
- Due checker runs every 30 seconds, dispatches via NotificationService
- Marks completed and reschedules repeats

### Notification Service
- Multi-channel dispatcher with per-channel config read from DB
- **Telegram**: Grammy bot, sends markdown-formatted messages
- **Signal**: REST API calls to local Signal CLI
- **SIP**: Twilio client, TTS call with reminder text
- **WebSocket**: Broadcasts to connected frontend clients
- All deliveries logged to `notification_log`

### Obsidian Service
- Chokidar watches `Task-List/*.md` in configured vault path
- Parses `- [marker] task text` lines with regex for 8 markers
- Upserts to tasks table with dedup by title+source_path
- Auto-removes tasks deleted from file
- Full sync scans all markdown files

### Pomodoro Service
- Server-side state machine: idle → running → paused → completed
- Tracks remaining seconds, work/break intervals
- Notifies on session complete
- Logs to `pomodoro_sessions` table

### Water Service
- Daily goal tracking with interval-based reminders
- Configurable active hours (start_hour/end_hour)
- Logs consumption events with channel attribution

### Scheduler
- starts water reminder checks on cron
- periodic obsidian sync trigger

---

## Frontend Components

### Dashboard
6 widgets in a 2-column responsive grid:
- **DashboardHeader**: Dynamic greeting based on time of day, live clock, weather placeholder, 5 metric pills (reminders, tasks, done, water, pomo)
- **CollectionCards**: LocalStorage-persisted CRUD cards with edit/delete
- **TodayTasks**: Full marker lifecycle — list with click-to-complete, Move Uncompleted button, lifecycle flow indicator, progress bar, 7-series chart
- **TaskChart**: SVG bar chart with 7 colored series, Day/Week/Month/All time filter, count labels
- **GoalCalendar**: Monthly grid with day numbers, streak tracking
- **PomodoroWidget**: Timer display, start/pause/reset, completed count
- **HabitsWidget**: 7-day habit grid with bio bar
- **WaterWidget**: Daily progress bar, log +250ml button

### Tasks Page
- Date-filtered table with 8-marker dropdown selector
- Add task modal with marker/source/tag fields
- Sync from Obsidian button
- Lifecycle stats card showing counts for all 7 marker types with color-coded pills

### Pomodoro Page
- Large timer display (MM:SS), start/pause/reset
- Settings form (work minutes, break minutes)
- Today's session history

### Water Page
- Log water with adjustable amount
- Settings: daily goal, interval, start/end hour, channel
- History list with timestamps

### Channels Page
- Telegram: bot token, chat ID
- Signal: number, REST URL
- SIP: Twilio account SID, auth token, phone numbers
- Toggle per channel, test button

### Settings Page
- Obsidian vault path (triggers watcher restart)
- Theme toggle (dark/light)
- Backend URL, JWT secret

---

## Obsidian Plugin (7 commands)

| Command ID | Label | Action |
|-----------|-------|--------|
| `open-mnemonic` | Open Mnemonic view | Toggle sidebar |
| `sync-tasks` | Sync tasks with Mnemonic | Batch push vault tasks |
| `create-reminder` | Create reminder | Input prompt → POST |
| `log-water` | Log water (+250ml) | POST to water/log |
| `pomo-start` | Start pomodoro | POST pomodoro/start |
| `pomo-stop` | Stop pomodoro | POST pomodoro/pause |
| `send-to-mnemonic` | Send current note as reminder | Note content → POST reminder |

Sidebar view displays: connection status, 6-metric stats row, inline marker distribution chart, today's task list with icon per marker, water progress bar, pomodoro state, 5 quick-action buttons. Auto-refreshes every 30s.

---

## Key Decisions

1. **SQLite over PostgreSQL** — Zero-config for self-hosted, no Docker needed for data layer. WAL mode for concurrent reads.
2. **Channel configs in DB** — Telegram/Signal/SIP credentials stored in `channel_config` table, read on each send. Not in `.env`. Configured via UI.
3. **Relative API paths** — Frontend uses `/api/*` with Vite proxy → backend. Works with any port without CORS issues in dev.
4. **Marker lifecycle stops at `[--]`** — No infinite fail cascade. `[--]` stays `[--]` on Move. Manual action required (close, skip, or complete).
5. **Batch sync for Obsidian** — Plugin collects all tasks into one array, sends to `POST /obsidian/batch` instead of N individual POSTs. Reduces HTTP overhead for large vaults.
6. **Dark theme default** — Tailwind `darkMode: "class"`, localStorage persistence.
7. **Server-side timer** — Pomodoro runs on backend, not just frontend. Survives page refresh.
8. **Graceful shutdown** — SIGTERM/SIGINT handlers close DB, stop watchers, HTTP drain.

---

## Configuration

### Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 4001 | Backend HTTP listen port |
| `WS_PORT` | 4002 | WebSocket listen port |
| `DB_PATH` | `./data/mnemonic.db` | SQLite file path |

### Startup
```sh
cd backend && PORT=4001 WS_PORT=4002 node src/index.js
cd frontend && npx vite --port 4000 --host
```

---

## Novelty

Mnemonic has specific novelty in three areas:

### 1. Day-Tracked Completion Markers
Most task systems (Todoist, TickTick, Notion) have binary done/not-done. Mnemonic's `[x]`/`[x2]`/`[x3]` markers track *which day* a task finished — whether it was completed same day, after one grace period, or after two failures. This enables **completion velocity analysis**: the chart shows how many tasks finish on day 1 vs day 2 vs day 3, giving insight into task difficulty and user productivity patterns that binary systems cannot capture.

### 2. Obsidian ↔ Web Hybrid Architecture
Obsidian is the authoring tool (fast markdown editing, vault-based organization), while the web app provides visual analytics that Obsidian cannot natively render — SVG bar charts with 7 marker series, live progress flows, lifecycle visualization, and full dashboard widgets. The bidirectional sync bridge (batch API + file watcher) lets users work in their preferred environment while still getting rich analytics. This hybrid pattern is uncommon in self-hosted productivity tools.

### 3. All-in-One Self-Hosted Productivity Stack
Task lifecycle management + pomodoro timer + water tracker + habits + reminders + multi-channel notifications (Telegram, Signal, *SIP phone calls*) in a single 300-line Express backend with SQLite. Most self-hosted alternatives (Vikunja, Plane, Focalboard) focus on one domain. Mnemonic integrates the full daily productivity workflow — planning, execution, hydration breaks, and timed focus sessions — into one zero-dependency app.

---

## Development Status

### Done
- Express backend with all 19+ API endpoints
- SQLite database with 8 tables, auto-migration, seed data
- Full marker system (8 markers) with lifecycle rules
- 7-series SVG chart with time range filtering
- Obsidian plugin: sidebar view, 7 commands, auto-sync, batch sync
- Obsidian file watcher with chokidar
- Notification service: Telegram, Signal, SIP, WebSocket
- Reminder service with repeat engine
- Pomodoro service (server-side timer)
- Water tracker with daily goals
- Multi-tab frontend (6 tabs)
- Settings page with vault path, theme toggle
- Channels configuration UI
- Health, markers, config, batch endpoints for plugin
- Comprehensive docs: README.md, docs/USAGE.md

### Todo / Future
- User authentication / multi-user support
- WebSocket real-time push for task updates
- Mobile-responsive layout refinements
- End-to-end encrypted channel configs
- Timezone support for reminders
- Recurring task support in marker system
- Search/filter across all tasks
- Import/export (CSV, JSON)
