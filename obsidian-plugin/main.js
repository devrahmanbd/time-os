import { Plugin, PluginSettingTab, Setting, Notice, ItemView, Modal } from 'obsidian';

const VIEW_TYPE = 'mnemonic-view';
const API_ENDPOINT = 'http://localhost:4001/api';

class MnemonicSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Mnemonic Sync Settings' });

    new Setting(containerEl)
      .setName('Backend URL')
      .setDesc('Mnemonic API server address')
      .addText(text => text
        .setPlaceholder('http://localhost:4001')
        .setValue(this.plugin.settings.backendUrl)
        .onChange(async val => {
          this.plugin.settings.backendUrl = val;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto Sync Interval (sec)')
      .setDesc('How often to sync tasks with Mnemonic')
      .addText(text => text
        .setPlaceholder('60')
        .setValue(String(this.plugin.settings.syncInterval))
        .onChange(async val => {
          this.plugin.settings.syncInterval = parseInt(val) || 60;
          await this.plugin.saveSettings();
          this.plugin.rescheduleSync();
        }));

    new Setting(containerEl)
      .setName('Sync Task-List folder')
      .setDesc('Auto-sync Obsidian Task-List/*.md files to Mnemonic')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.syncTaskList)
        .onChange(async val => {
          this.plugin.settings.syncTaskList = val;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Notifications')
      .setDesc('Show Mnemonic notifications in Obsidian')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showNotifications)
        .onChange(async val => {
          this.plugin.settings.showNotifications = val;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('hr');
    containerEl.createEl('p', {
      text: 'Mnemonic v1.0.0 — Your memory layer above all apps',
      attr: { style: 'color: var(--text-muted); font-size: 0.8em;' }
    });
  }
}

class MnemonicView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Mnemonic'; }
  getIcon() { return 'memory'; }

  async onOpen() {
    await this.render();
    this.plugin.registerInterval(window.setInterval(() => this.render(), 30000));
  }

  async render() {
    const { containerEl } = this;
    containerEl.empty();

    const header = containerEl.createEl('div', { cls: 'mnemonic-header' });
    header.createEl('h3', { text: 'Mnemonic', attr: { style: 'margin:0;font-size:1.2em' } });
    header.createEl('span', { text: 'today', attr: { style: 'color:var(--text-muted);font-size:0.8em' } });

    try {
      const base = this.plugin.settings.backendUrl || API_ENDPOINT.replace('/api', '');
      const statsResp = await fetch(`${base}/api/stats`);
      const stats = await statsResp.json();

      // Health check first
      const healthResp = await fetch(`${base}/api/obsidian/health`);
      const health = await healthResp.json();

      // Marker distribution
      const markersResp = await fetch(`${base}/api/obsidian/markers`);
      const markers = await markersResp.json();

      const tasksResp = await fetch(`${base}/api/tasks?date=${this.getTodayDate()}`);
      const tasks = await tasksResp.json();

      const waterResp = await fetch(`${base}/api/water`);
      const water = await waterResp.json();

      const pomoResp = await fetch(`${base}/api/pomodoro`);
      const pomo = await pomoResp.json();

      // Status badge
      const badge = header.createDiv({ attr: { style: 'display:flex;align-items:center;gap:4px;font-size:0.7em;margin-top:2px' } });
      const dot = badge.createSpan({ attr: { style: `display:inline-block;width:6px;height:6px;border-radius:50%;background:${health.status === 'ok' ? '#a6e3a1' : '#f38ba8'}` } });
      badge.createSpan({ text: health.status === 'ok' ? `connected (${health.tasks_total} tasks)` : 'offline', attr: { style: 'color:var(--text-muted)' } });

      // Stats row
      const statsRow = containerEl.createDiv({ cls: 'mnemonic-stats', attr: { style: 'display:flex;gap:6px;margin:12px 0;flex-wrap:wrap' } });
      const mkStat = (label, val, color) => {
        const pill = statsRow.createDiv({ attr: { style: `background:var(--background-modifier-hover);padding:3px 8px;border-radius:6px;font-size:0.75em;text-align:center;border-left:2px solid ${color || 'var(--interactive-accent)'}` } });
        pill.createEl('strong', { text: String(val), attr: { style: 'display:block;font-size:1em' } });
        pill.createEl('span', { text: label, attr: { style: 'color:var(--text-muted);font-size:0.7em' } });
      };
      mkStat('All', markers.total);
      mkStat('Done', markers.done, '#a6e3a1');
      mkStat('Grace', markers.grace, '#f9e2af');
      mkStat('Failed', markers.failed_twice, '#f38ba8');
      mkStat('Skip', markers.skipped, '#6c7086');
      mkStat('Pending', markers.pending, '#89b4fa');

      // Mini chart (inline marker distribution)
      if (markers.series && markers.series.length > 0) {
        const chartRow = containerEl.createDiv({ attr: { style: 'display:flex;gap:2px;height:8px;margin:4px 0 8px;border-radius:4px;overflow:hidden' } });
        const maxCount = Math.max(1, ...markers.series.map(s => s.count));
        for (const s of markers.series) {
          if (s.count > 0) {
            const pct = (s.count / Math.max(1, markers.total)) * 100;
            chartRow.createDiv({ attr: { style: `width:${pct}%;height:100%;background:${s.color};opacity:0.8` } });
          }
        }
      }

      // Today's tasks
      if (tasks && tasks.length > 0) {
        containerEl.createEl('h4', { text: "Today's Tasks", attr: { style: 'margin:8px 0 4px;font-size:0.85em' } });
        const taskList = containerEl.createDiv();
        const markerIcon = (m) => {
          if (m === 'x') return '✅';
          if (m === 'x2') return '✔️';
          if (m === 'x3') return '☑️';
          if (m === '-') return '⚠️';
          if (m === '--') return '❌';
          if (m === '+') return '🔒';
          return '⬜';
        };
        tasks.forEach(t => {
          const item = taskList.createDiv({ attr: { style: 'display:flex;align-items:center;gap:4px;padding:2px 0;font-size:0.8em' } });
          item.createSpan({ text: markerIcon(t.marker) });
          const titleSpan = item.createSpan({ text: t.title });
          if (['x','x2','x3'].includes(t.marker)) {
            titleSpan.setAttr('style', 'text-decoration:line-through;color:var(--text-muted)');
          }
        });
      }

      // Water progress
      if (water) {
        const goal = (water.settings && water.settings.daily_goal_ml) || 2000;
        const total = water.today_total || 0;
        const pct = Math.min(100, Math.round((total / goal) * 100));
        containerEl.createEl('h4', { text: `Water: ${total}/${goal}ml`, attr: { style: 'margin:8px 0 2px;font-size:0.8em' } });
        const bar = containerEl.createDiv({ attr: { style: 'height:4px;background:var(--background-modifier-hover);border-radius:2px;overflow:hidden' } });
        bar.createDiv({ attr: { style: `width:${pct}%;height:100%;background:var(--interactive-accent);border-radius:2px;transition:width 0.5s` } });
      }

      // Pomodoro
      if (pomo) {
        const state = pomo.state || 'idle';
        const remaining = pomo.remaining || 0;
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        containerEl.createEl('h4', { text: `Pomodoro: ${state}`, attr: { style: 'margin:8px 0 2px;font-size:0.8em' } });
        containerEl.createSpan({
          text: state === 'running' ? `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}` : state,
          attr: { style: 'font-family:monospace;font-size:1.1em' }
        });
      }

    } catch (e) {
      containerEl.createDiv({
        text: '⚠️ Backend offline. Configure URL in Settings → Mnemonic Sync.',
        attr: { style: 'color:var(--text-warning);font-size:0.85em;margin-top:12px' }
      });
    }

    // Quick actions
    const actions = containerEl.createDiv({ attr: { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:16px' } });
    const mkBtn = (label, cb) => {
      const btn = actions.createEl('button', {
        text: label,
        attr: { style: 'padding:4px 10px;border-radius:6px;border:1px solid var(--background-modifier-border);background:var(--background-primary);cursor:pointer;font-size:0.8em' }
      });
      btn.addEventListener('click', cb);
    };
    mkBtn('+ Reminder', () => this.plugin.createReminder());
    mkBtn('+ Water 250ml', () => this.plugin.logWater());
    mkBtn('Pomo Start', () => this.plugin.pomoAction('start'));
    mkBtn('Pomo Stop', () => this.plugin.pomoAction('pause'));
    mkBtn('Sync Now', () => this.plugin.syncAll());
  }

  getTodayDate() {
    const d = new Date();
    const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return String(d.getDate()).padStart(2,'0') + '-' + mons[d.getMonth()];
  }
}

const DEFAULT_SETTINGS = {
  backendUrl: 'http://localhost:4001',
  syncInterval: 60,
  syncTaskList: true,
  showNotifications: true
};

export default class MnemonicPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MnemonicSettingTab(this.app, this));

    this.registerView(VIEW_TYPE, (leaf) => new MnemonicView(leaf, this));

    this.addRibbonIcon('clock', 'Mnemonic', () => this.toggleView());

    this.addCommand({
      id: 'open-mnemonic',
      name: 'Open Mnemonic view',
      callback: () => this.toggleView()
    });

    this.addCommand({
      id: 'sync-tasks',
      name: 'Sync tasks with Mnemonic',
      callback: () => this.syncAll()
    });

    this.addCommand({
      id: 'create-reminder',
      name: 'Create reminder',
      callback: () => this.createReminder()
    });

    this.addCommand({
      id: 'log-water',
      name: 'Log water (+250ml)',
      callback: () => this.logWater()
    });

    this.addCommand({
      id: 'pomo-start',
      name: 'Start pomodoro',
      callback: () => this.pomoAction('start')
    });

    this.addCommand({
      id: 'pomo-stop',
      name: 'Stop pomodoro',
      callback: () => this.pomoAction('pause')
    });

    this.addCommand({
      id: 'send-to-mnemonic',
      name: 'Send current note as reminder',
      callback: () => this.sendCurrentNote()
    });

    this.registerInterval(window.setInterval(() => {
      if (this.settings.syncTaskList) this.syncAll();
    }, this.settings.syncInterval * 1000));
  }

  async toggleView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async syncAll() {
    const base = this.settings.backendUrl || 'http://localhost:4001';
    try {
      // Health check first
      const healthRes = await fetch(`${base}/api/obsidian/health`);
      if (!healthRes.ok) throw new Error('Backend unreachable');
      const health = await healthRes.json();

      // Scan Task-List folder
      const files = this.app.vault.getMarkdownFiles().filter(f =>
        f.path.startsWith('Task-List/') && /^\d{2}-[A-Z][a-z]{2}\.md$/.test(f.name)
      );
      const batch = [];
      for (const file of files) {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const date = file.basename;

        for (const line of lines) {
          const match = line.match(/^- \[([ \-\+x]{1,2}x?)\]\s*(.+)/);
          if (!match) continue;
          const marker = match[1].trim();
          const title = match[2].trim();
          batch.push({ title, marker, due_date: date, source_file: file.name, source_path: file.path });
        }
      }

      if (batch.length === 0) {
        if (this.settings.showNotifications) new Notice('Mnemonic: no new tasks to sync');
        return;
      }

      const resp = await fetch(`${base}/api/obsidian/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: batch })
      });
      const result = await resp.json();

      if (this.settings.showNotifications) {
        new Notice(`Mnemonic: synced ${result.synced || batch.length} tasks`);
      }
      this.refreshView();
    } catch (e) {
      new Notice(`Mnemonic sync failed: ${e.message}`);
    }
  }

  async createReminder() {
    const title = await this.inputPrompt('Reminder title', 'e.g. Call John at 3pm');
    if (!title) return;
    const base = this.settings.backendUrl || 'http://localhost:4001';
    try {
      const dueAt = Math.floor(Date.now() / 1000) + 3600;
      await fetch(`${base}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_at: dueAt, repeat: 'none' })
      });
      new Notice(`✓ Reminder created: ${title}`);
      this.refreshView();
    } catch (e) {
      new Notice(`Failed: ${e.message}`);
    }
  }

  async logWater(amount) {
    const base = this.settings.backendUrl || 'http://localhost:4001';
    try {
      await fetch(`${base}/api/water/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_ml: amount || 250 })
      });
      new Notice(`💧 +${amount || 250}ml water logged`);
      this.refreshView();
    } catch (e) {
      new Notice(`Failed: ${e.message}`);
    }
  }

  async pomoAction(action) {
    const base = this.settings.backendUrl || 'http://localhost:4001';
    try {
      await fetch(`${base}/api/pomodoro/${action}`, { method: 'POST' });
      new Notice(`Pomodoro: ${action}`);
      this.refreshView();
    } catch (e) {
      new Notice(`Failed: ${e.message}`);
    }
  }

  async sendCurrentNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice('No active note'); return; }
    const content = await this.app.vault.read(file);
    const base = this.settings.backendUrl || 'http://localhost:4001';
    try {
      await fetch(`${base}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.basename,
          description: content.slice(0, 500),
          due_at: Math.floor(Date.now() / 1000) + 86400,
          repeat: 'none'
        })
      });
      new Notice(`📄 Sent "${file.basename}" to Mnemonic`);
    } catch (e) {
      new Notice(`Failed: ${e.message}`);
    }
  }

  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view && view.render) view.render();
    }
  }

  rescheduleSync() {
    this.registerInterval(window.setInterval(() => {
      if (this.settings.syncTaskList) this.syncAll();
    }, this.settings.syncInterval * 1000));
  }

  inputPrompt(placeholder, desc) {
    return new Promise(resolve => {
      const modal = new Modal(this.app);
      modal.titleEl.createEl('h3', { text: placeholder });
      const input = modal.contentEl.createEl('input', {
        attr: { type: 'text', placeholder: desc || '', style: 'width:100%;padding:8px;border-radius:6px;border:1px solid var(--background-modifier-border);background:var(--background-primary);color:var(--text-normal)' }
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { modal.close(); resolve(input.value); }
        if (e.key === 'Escape') { modal.close(); resolve(null); }
      });
      modal.open();
      setTimeout(() => input.focus(), 100);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
