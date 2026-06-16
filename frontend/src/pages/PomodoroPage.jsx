import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings as SettingsIcon, History } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../api';

export default function PomodoroPage() {
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [seconds, setSeconds] = useState(1500);
  const [running, setRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [sessions, setSessions] = useState(0);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [workInput, setWorkInput] = useState(25);
  const [breakInput, setBreakInput] = useState(5);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => { fetchState(); fetchHistory(); }, []);

  const fetchState = async () => {
    try {
      const data = await apiGet('/pomodoro');
      if (data) {
        setWorkMins(data.workMinutes || 25);
        setBreakMins(data.breakMinutes || 5);
        setSessions(data.completed || 0);
        setRunning(data.state === 'running');
        if (data.remaining) setSeconds(data.remaining);
        setIsWork(data.state !== 'break');
      }
    } catch (e) { setError(e.message); }
  };

  const fetchHistory = async () => {
    try {
      const data = await apiGet('/pomodoro/history');
      if (data) setHistory(data);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (isWork) {
              setSessions(n => n + 1);
              setIsWork(false);
              setSeconds(breakMins * 60);
              logSession('work');
            } else {
              setIsWork(true);
              setSeconds(workMins * 60);
              logSession('break');
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, isWork, workMins, breakMins]);

  const logSession = async (type) => {
    try { await apiPost('/pomodoro/session', { type, completed: true }); fetchHistory(); } catch (e) {}
  };

  const toggleTimer = async () => {
    try {
      if (running) { await apiPost('/pomodoro/pause'); setRunning(false); }
      else { await apiPost('/pomodoro/start'); setRunning(true); }
    } catch (e) { setError(e.message); }
  };

  const resetTimer = async () => {
    try {
      await apiPost('/pomodoro/reset');
      setRunning(false);
      setIsWork(true);
      setSeconds(workMins * 60);
    } catch (e) { setError(e.message); }
  };

  const saveSettings = async () => {
    try {
      await apiPut('/pomodoro/settings', { work_minutes: workInput, break_minutes: breakInput });
      setWorkMins(workInput);
      setBreakMins(breakInput);
      setSeconds(workInput * 60);
      setIsWork(true);
      setRunning(false);
      setShowSettings(false);
    } catch (e) { setError(e.message); }
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const total = isWork ? workMins * 60 : breakMins * 60;
  const pct = total > 0 ? ((total - seconds) / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pomodoro</h1>
        <div className="flex gap-2">
          <button onClick={fetchHistory} className="btn btn-secondary text-sm flex items-center gap-1">
            <History size={14} /> History
          </button>
          <button onClick={() => setShowSettings(true)} className="btn btn-secondary p-1.5">
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-yellow bg-yellow/10 rounded-lg px-3 py-2">{error}</div>}

      <div className="card text-center py-12">
        <div className="text-7xl font-mono font-bold tabular-nums mb-4">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
        <div className="text-lg text-text2 mb-4">
          {isWork ? 'Focus Time' : 'Break'} · {sessions} completed
        </div>

        <div className="max-w-md mx-auto mb-6">
          <div className="progress-bar">
            <div className={`progress-fill ${isWork ? 'bg-accent' : 'bg-green'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={toggleTimer} className="btn btn-primary flex items-center gap-2 px-6 py-3 text-base">
            {running ? <Pause size={20} /> : <Play size={20} />}
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={resetTimer} className="btn btn-secondary px-4 py-3">
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><History size={16} /> Today's Sessions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30">
                <span className="text-accent">Session</span>
                <span className="text-muted text-xs">{s.started_at ? new Date(s.started_at * 1000).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Settings</h3>
            <div className="space-y-3">
              <div><label className="text-sm text-text2 block mb-1">Work (min)</label>
                <input className="input" type="number" min="1" max="120" value={workInput} onChange={e => setWorkInput(parseInt(e.target.value) || 25)} /></div>
              <div><label className="text-sm text-text2 block mb-1">Break (min)</label>
                <input className="input" type="number" min="1" max="30" value={breakInput} onChange={e => setBreakInput(parseInt(e.target.value) || 5)} /></div>
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
