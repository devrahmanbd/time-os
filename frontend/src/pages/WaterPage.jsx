import React, { useState, useEffect } from 'react';
import { Droplets, Plus, Settings as SettingsIcon, History } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../api';

export default function WaterPage() {
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [intake, setIntake] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [goalInput, setGoalInput] = useState(2000);
  const [reminderInterval, setReminderInterval] = useState(60);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/water');
      if (data) {
        setIntake(data.today_total || 0);
        if (data.settings) {
          setDailyGoal(data.settings.daily_goal_ml || 2000);
          setGoalInput(data.settings.daily_goal_ml || 2000);
          setReminderInterval(data.settings.interval_minutes || 60);
          setReminderEnabled(!!data.settings.enabled);
          setStartHour(data.settings.start_hour || 8);
          setEndHour(data.settings.end_hour || 22);
        }
      }
      const hist = await apiGet('/water/history');
      if (hist) setHistory(hist);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const logWater = async (amount) => {
    try {
      const result = await apiPost('/water/log', { amount_ml: amount });
      if (result) setIntake(result.today_total || intake + amount);
      setError(null);
    } catch (e) { setError(e.message); }
  };

  const logCustom = () => {
    const amt = parseInt(customAmount);
    if (!amt || amt <= 0) return;
    logWater(amt);
    setCustomAmount('');
  };

  const saveSettings = async () => {
    try {
      await apiPut('/water/settings', {
        daily_goal_ml: goalInput,
        interval_minutes: reminderInterval,
        enabled: reminderEnabled ? 1 : 0,
        start_hour: startHour,
        end_hour: endHour,
      });
      setDailyGoal(goalInput);
      setShowSettings(false);
    } catch (e) { setError(e.message); }
  };

  const pct = Math.min(100, Math.round((intake / dailyGoal) * 100));

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Water Tracker</h1>
        <button onClick={() => setShowSettings(true)} className="btn btn-secondary text-sm flex items-center gap-1">
          <SettingsIcon size={14} /> Settings
        </button>
      </div>

      {error && <div className="text-sm text-yellow bg-yellow/10 rounded-lg px-3 py-2">{error}</div>}

      <div className="card text-center py-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Droplets size={48} className="text-accent" />
          <div>
            <div className="text-5xl font-bold text-accent tabular-nums">{intake}</div>
            <div className="text-text2">of {dailyGoal} ml</div>
          </div>
        </div>

        <div className="max-w-md mx-auto mb-6">
          <div className="progress-bar h-4">
            <div className="progress-fill bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-sm text-text2 mt-1">{pct}% of daily goal</div>
        </div>

        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          <button onClick={() => logWater(250)} className="btn btn-secondary px-4 py-2 text-sm">+250ml</button>
          <button onClick={() => logWater(500)} className="btn btn-secondary px-4 py-2 text-sm">+500ml</button>
          <button onClick={() => logWater(1000)} className="btn btn-secondary px-4 py-2 text-sm">+1000ml</button>
        </div>

        <div className="flex justify-center gap-2 max-w-xs mx-auto">
          <input className="input text-center" type="number" min="1" placeholder="Custom ml"
            value={customAmount} onChange={e => setCustomAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && logCustom()} />
          <button onClick={logCustom} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Log</button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><History size={16} /> Today's Log</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30">
                <span className="flex items-center gap-2"><Droplets size={14} className="text-accent" /> +{h.amount_ml}ml</span>
                <span className="text-muted text-xs">{h.logged_at ? new Date(h.logged_at * 1000).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Water Settings</h3>
            <div className="space-y-3">
              <div><label className="text-sm text-text2 block mb-1">Daily Goal (ml)</label>
                <input className="input" type="number" min="100" max="10000" value={goalInput} onChange={e => setGoalInput(parseInt(e.target.value) || 2000)} /></div>
              <div><label className="text-sm text-text2 block mb-1">Reminder Interval (min)</label>
                <input className="input" type="number" min="15" max="480" value={reminderInterval} onChange={e => setReminderInterval(parseInt(e.target.value) || 60)} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="reminder-enabled" checked={reminderEnabled} onChange={e => setReminderEnabled(e.target.checked)} className="accent-accent" />
                <label htmlFor="reminder-enabled" className="text-sm text-text2">Enable Reminders</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-text2 block mb-1">Start Hour</label>
                  <input className="input" type="number" min="0" max="23" value={startHour} onChange={e => setStartHour(parseInt(e.target.value) || 8)} /></div>
                <div><label className="text-sm text-text2 block mb-1">End Hour</label>
                  <input className="input" type="number" min="0" max="23" value={endHour} onChange={e => setEndHour(parseInt(e.target.value) || 22)} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
