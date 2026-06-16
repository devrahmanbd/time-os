import React, { useState, useEffect } from 'react';
import { Plus, Settings as SettingsIcon } from 'lucide-react';
import { apiGet, apiPost } from '../api';

export default function WaterWidget() {
  const [dailyGoal, setDailyGoal] = useState(() => parseInt(localStorage.getItem('mnemonic-water-goal') || '2000'));
  const [intake, setIntake] = useState(() => parseInt(localStorage.getItem('mnemonic-water-intake') || '0'));
  const [showSettings, setShowSettings] = useState(false);
  const [goalInput, setGoalInput] = useState(dailyGoal);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const savedDate = localStorage.getItem('mnemonic-water-date');
    if (savedDate !== today) {
      setIntake(0);
      localStorage.setItem('mnemonic-water-date', today);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mnemonic-water-goal', String(dailyGoal));
  }, [dailyGoal]);

  useEffect(() => {
    localStorage.setItem('mnemonic-water-intake', String(intake));
  }, [intake]);

  const logWater = async (amount) => {
    setIntake(i => i + amount);
    try {
      await apiPost('/water/log', { amount_ml: amount });
      setApiError(null);
    } catch (e) {
      setApiError(e.message);
    }
  };

  const saveSettings = () => {
    setDailyGoal(goalInput);
    setShowSettings(false);
  };

  const pct = Math.min(100, Math.round((intake / dailyGoal) * 100));

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Water</h2>
        <button onClick={() => setShowSettings(true)} className="text-text2 hover:text-text p-1">
          <SettingsIcon size={16} />
        </button>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold text-accent tabular-nums">{intake}</div>
        <div className="text-sm text-text2">of {dailyGoal} ml</div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill bg-accent" style={{ width: `${pct}%` }} />
      </div>

      <button onClick={() => logWater(250)} className="btn btn-primary w-full flex items-center justify-center gap-2">
        <Plus size={16} /> Log 250ml
      </button>

      {apiError && (
        <div className="text-xs text-yellow text-center">{apiError}</div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Water Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-text2 block mb-1">Daily Goal (ml)</label>
                <input className="input" type="number" min="100" max="10000" value={goalInput} onChange={e => setGoalInput(parseInt(e.target.value) || 2000)} />
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
