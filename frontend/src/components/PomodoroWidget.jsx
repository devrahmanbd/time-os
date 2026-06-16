import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { apiGet, apiPost } from '../api';

export default function PomodoroWidget() {
  const [workMins, setWorkMins] = useState(() => parseInt(localStorage.getItem('mnemonic-pomo-work') || '25'));
  const [breakMins, setBreakMins] = useState(() => parseInt(localStorage.getItem('mnemonic-pomo-break') || '5'));
  const [seconds, setSeconds] = useState(workMins * 60);
  const [running, setRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [workInput, setWorkInput] = useState(workMins);
  const [breakInput, setBreakInput] = useState(breakMins);
  const intervalRef = useRef(null);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    localStorage.setItem('mnemonic-pomo-work', String(workMins));
    localStorage.setItem('mnemonic-pomo-break', String(breakMins));
  }, [workMins, breakMins]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (isWork) {
              setSessions(s => s + 1);
              setIsWork(false);
              setSeconds(breakMins * 60);
              notifySession();
            } else {
              setIsWork(true);
              setSeconds(workMins * 60);
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, isWork, workMins, breakMins]);

  const toggleTimer = () => setRunning(r => !r);

  const resetTimer = () => {
    setRunning(false);
    setIsWork(true);
    setSeconds(workMins * 60);
  };

  const notifySession = async () => {
    try {
      await apiPost('/pomodoro/session', { completed: true });
      setApiError(null);
    } catch (e) {
      setApiError(e.message);
    }
  };

  const saveSettings = () => {
    setWorkMins(workInput);
    setBreakMins(breakInput);
    setSeconds(workInput * 60);
    setIsWork(true);
    setRunning(false);
    setShowSettings(false);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const total = isWork ? workMins * 60 : breakMins * 60;
  const pct = total > 0 ? ((total - seconds) / total) * 100 : 0;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pomodoro</h2>
        <button onClick={() => setShowSettings(true)} className="text-text2 hover:text-text p-1">
          <SettingsIcon size={16} />
        </button>
      </div>

      <div className="text-center">
        <div className="text-4xl font-mono font-bold tabular-nums mb-1">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
        <div className="text-sm text-text2">{isWork ? 'Work' : 'Break'} · {sessions} sessions</div>
      </div>

      <div className="progress-bar">
        <div className={`progress-fill ${isWork ? 'bg-accent' : 'bg-green'}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={toggleTimer} className="btn btn-primary flex items-center gap-1">
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={resetTimer} className="btn btn-secondary">
          <RotateCcw size={16} />
        </button>
      </div>

      {apiError && (
        <div className="text-xs text-yellow text-center">{apiError}</div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Pomodoro Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-text2 block mb-1">Work Duration (min)</label>
                <input className="input" type="number" min="1" max="120" value={workInput} onChange={e => setWorkInput(parseInt(e.target.value) || 25)} />
              </div>
              <div>
                <label className="text-sm text-text2 block mb-1">Break Duration (min)</label>
                <input className="input" type="number" min="1" max="30" value={breakInput} onChange={e => setBreakInput(parseInt(e.target.value) || 5)} />
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
