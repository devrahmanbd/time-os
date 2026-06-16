import React, { useState, useEffect } from 'react';
import { Moon, Sun, Info, Server, Key, BookOpen } from 'lucide-react';
import { apiGet, apiPut } from '../api';

export default function SettingsPage({ theme, setTheme }) {
  const [vaultPath, setVaultPath] = useState('');
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('mnemonic-backend-url') || 'http://localhost:3001');
  const [jwtSecret, setJwtSecret] = useState(() => localStorage.getItem('mnemonic-jwt-secret') || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiGet('/settings');
      if (data && data.obsidian_vault_path) setVaultPath(data.obsidian_vault_path);
    } catch (e) { /* backend may be offline */ }
  };

  const handleSave = async () => {
    setSaved(false);
    setError(null);
    try {
      await apiPut('/settings/obsidian_vault_path', { value: vaultPath });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSyncObsidian = async () => {
    try {
      const { apiPost } = await import('../api');
      await apiPost('/obsidian/sync', {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {error && <div className="text-sm text-red bg-red/10 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen size={16} className="text-accent" /> Obsidian
          </h3>
          <div>
            <label className="text-sm text-text2 block mb-1">Vault Path</label>
            <input className="input text-sm" value={vaultPath}
              onChange={e => setVaultPath(e.target.value)}
              placeholder="/path/to/obsidian/vault" />
            <p className="text-xs text-muted mt-1">Syncs Task-List/*.md files automatically.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSyncObsidian} className="btn btn-secondary text-sm">Sync Now</button>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Server size={16} className="text-accent" /> Connection
          </h3>
          <div>
            <label className="text-sm text-text2 block mb-1">Backend URL</label>
            <input className="input text-sm" value={backendUrl}
              onChange={e => { setBackendUrl(e.target.value); localStorage.setItem('mnemonic-backend-url', e.target.value); }}
              placeholder="http://localhost:3001" />
            <p className="text-xs text-muted mt-1">Where the Mnemonic API server runs.</p>
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key size={16} className="text-accent" /> Authentication
          </h3>
          <div>
            <label className="text-sm text-text2 block mb-1">JWT Secret</label>
            <input className="input text-sm" type="password" value={jwtSecret}
              onChange={e => { setJwtSecret(e.target.value); localStorage.setItem('mnemonic-jwt-secret', e.target.value); }}
              placeholder="Enter JWT secret (future use)" />
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {theme === 'dark' ? <Moon size={16} className="text-accent" /> : <Sun size={16} className="text-yellow" />}
            Appearance
          </h3>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme('dark')}
              className={`btn flex items-center gap-2 ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}>
              <Moon size={14} /> Dark
            </button>
            <button onClick={() => setTheme('light')}
              className={`btn flex items-center gap-2 ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}>
              <Sun size={14} /> Light
            </button>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Info size={16} className="text-accent" /> About</h3>
        <div className="space-y-1 text-sm text-text2">
          <p><span className="text-text">Mnemonic</span> v1.0.0</p>
          <p>A memorae.ai alternative for devs, entrepreneurs, learners.</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={handleSyncObsidian} className="btn btn-secondary">Sync Obsidian</button>
        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
