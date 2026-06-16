# Mnemonic Sync — Obsidian Plugin

Syncs your Obsidian vault with the Mnemonic backend. Full documentation: [`docs/USAGE.md`](../docs/USAGE.md).

## Install

1. Copy this folder to your vault: `.obsidian/plugins/mnemonic-sync/`
2. Enable in **Settings → Community Plugins**
3. Set backend URL in **Settings → Mnemonic Sync**

## Quick Reference

| Command | Action |
|---------|--------|
| Open Mnemonic view | Toggle sidebar panel |
| Sync tasks with Mnemonic | Manual sync from Task-List/ |
| Create reminder | Prompt → creates 1-hour reminder |
| Log water (+250ml) | Logs water consumption |
| Start/Stop pomodoro | Controls timer session |
| Send current note | Sends active note as reminder |

## Supported Markers

| File | Marker |
|------|--------|
| `[ ]` | Pending |
| `[-]` | Grace (failed once) |
| `[--]` | Failed twice |
| `[+]` | Skipped/unnecessary |
| `[x]` | Done Day 1 |
| `[x2]` | Done Day 2 |
| `[x3]` | Done Day 3 |

Files must be in `Task-List/{DD}-{Mon}.md` format (e.g. `16-Jun.md`).

See [`docs/USAGE.md`](../docs/USAGE.md) for the complete guide on the web app, marker lifecycle, API reference, and troubleshooting.
