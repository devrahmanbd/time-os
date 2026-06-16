import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api';
import { Plus, RefreshCw, RotateCw, AlertCircle } from 'lucide-react';

function markerLabel(marker) {
  switch (marker) {
    case ' ': return { text: '[ ]', color: 'text-muted', label: 'Pending' };
    case '-': return { text: '[-]', color: 'text-yellow', label: 'Grace' };
    case '--': return { text: '[--]', color: 'text-red', label: 'Failed Twice' };
    case '+': return { text: '[+]', color: 'text-text2', label: 'Skipped' };
    case 'x': return { text: '[x]', color: 'text-green', label: 'Done Day 1' };
    case 'x2': return { text: '[x2]', color: 'text-green', label: 'Done Day 2' };
    case 'x3': return { text: '[x3]', color: 'text-green', label: 'Done Day 3' };
    default: return { text: `[${marker}]`, color: 'text-muted', label: marker };
  }
}

const doneMarkers = ['x', 'x2', 'x3'];
const markers = [' ', '-', '--', '+', 'x', 'x2', 'x3'];

export default function TasksPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', marker: ' ', source: '', tag: '' });

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/tasks?date=${selectedDate}`);
      setTasks(data || []);
    } catch (e) {
      setError(e.message);
      setTasks([]);
    }
    setLoading(false);
  };

  const syncFromObsidian = async () => {
    try {
      await apiPost('/obsidian/sync', {});
      fetchTasks();
    } catch (e) {
      setError(e.message);
    }
  };

  const addTask = async () => {
    if (!form.title.trim()) return;
    try {
      const newTask = await apiPost('/tasks', {
        ...form,
        due_date: selectedDate,
      });
      setTasks([...tasks, newTask]);
      setShowAdd(false);
      setForm({ title: '', marker: ' ', source: '', tag: '' });
    } catch (e) {
      setError(e.message);
    }
  };

  const updateMarker = async (id, marker) => {
    try {
      let failed_count = tasks.find(t => t.id === id)?.failed_count || 0;
      if (marker === '-') failed_count = 1;
      else if (marker === '--') failed_count = 2;
      else if (marker === ' ' || marker === 'x') failed_count = 0;
      else if (marker === 'x2') failed_count = 1;
      else if (marker === 'x3') failed_count = 2;
      await apiPatch(`/tasks/${id}`, { marker, failed_count });
      setTasks(tasks.map(t => t.id === id ? { ...t, marker, failed_count } : t));
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteTask = async (id) => {
    try {
      await apiDelete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input w-auto text-sm"
          />
          <button onClick={fetchTasks} className="btn btn-secondary p-1.5" title="Refresh">
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={syncFromObsidian} className="btn btn-secondary flex items-center gap-1 text-sm">
            <RefreshCw size={14} /> Sync from Obsidian
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-1 text-sm">
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow bg-yellow/10 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted font-medium">Marker Lifecycle:</span>
            {[
              { marker: ' ', label: 'Pending', cls: 'text-muted', bg: 'bg-muted/10' },
              { marker: '-', label: 'Grace', cls: 'text-yellow', bg: 'bg-yellow/10' },
              { marker: '--', label: 'Failed Twice', cls: 'text-red', bg: 'bg-red/10' },
              { marker: '+', label: 'Skipped', cls: 'text-text2', bg: 'bg-surface2' },
              { marker: 'x', label: 'Done D1', cls: 'text-green', bg: 'bg-green/10' },
              { marker: 'x2', label: 'Done D2', cls: 'text-green', bg: 'bg-green/10' },
              { marker: 'x3', label: 'Done D3', cls: 'text-green', bg: 'bg-green/10' },
            ].map(s => {
              const count = tasks.filter(t => t.marker === s.marker).length;
              return (
                <div key={s.marker} className={`flex items-center gap-1.5 ${s.bg} rounded-lg px-2.5 py-1.5`}>
                  <span className={`font-mono text-xs ${s.cls}`}>{s.marker === ' ' ? '[ ]' : `[${s.marker}]`}</span>
                  <span className="text-text2 text-xs">{s.label}</span>
                  <span className={`font-semibold text-sm ${s.cls}`}>{count}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1 text-xs text-muted ml-auto">
              <span className="font-mono">[ ]</span>→<span className="font-mono text-yellow">[-]</span>→<span className="font-mono text-red">[--]</span>
              <span className="mx-1">|</span>
              <span className="font-mono text-text2">[+]</span>
              <span className="mx-1">|</span>
              <span className="font-mono text-green">[x]</span>
              <span className="font-mono text-green">[x2]</span>
              <span className="font-mono text-green">[x3]</span>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 && !loading ? (
        <div className="card text-center py-12 text-text2">
          <p className="mb-2">No tasks for {selectedDate}.</p>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary text-sm">Add Task</button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted font-medium">Marker</th>
                <th className="text-left py-2 px-2 text-muted font-medium">Title</th>
                <th className="text-left py-2 px-2 text-muted font-medium hidden sm:table-cell">Source</th>
                <th className="text-left py-2 px-2 text-muted font-medium hidden sm:table-cell">Tag</th>
                <th className="text-left py-2 px-2 text-muted font-medium hidden md:table-cell">Fails</th>
                <th className="text-left py-2 px-2 text-muted font-medium">Date</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const ml = markerLabel(task.marker);
                return (
                  <tr key={task.id} className="border-b border-border/50 hover:bg-surface2/30">
                    <td className="py-2 px-2">
                      <select
                        value={task.marker}
                        onChange={e => updateMarker(task.id, e.target.value)}
                        className={`bg-transparent border border-border rounded px-1 py-0.5 text-sm font-mono cursor-pointer ${ml.color}`}
                      >
                        {markers.map(m => (
                          <option key={m} value={m} className="text-text bg-surface">{markerLabel(m).text}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <span className={doneMarkers.includes(task.marker) ? 'line-through text-text2' : ''}>
                        {task.title}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-muted text-xs hidden sm:table-cell">{task.source || '-'}</td>
                    <td className="py-2 px-2 hidden sm:table-cell">
                      {task.tag && <span className="text-xs px-1.5 py-0.5 rounded bg-surface2 text-text2">{task.tag}</span>}
                    </td>
                    <td className="py-2 px-2 text-xs hidden md:table-cell">
                      {task.failed_count > 0 && (
                        <span className={`font-mono ${task.failed_count >= 2 ? 'text-red' : 'text-yellow'}`}>
                          x{task.failed_count}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted">{task.due_date || task.date}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => deleteTask(task.id)} className="text-red/60 hover:text-red text-xs">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Task</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-text2 block mb-1">Title</label>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" />
              </div>
              <div>
                <label className="text-sm text-text2 block mb-1">Marker</label>
                <select className="input" value={form.marker} onChange={e => setForm({ ...form, marker: e.target.value })}>
                  {markers.map(m => <option key={m} value={m}>{markerLabel(m).text} - {markerLabel(m).label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-text2 block mb-1">Source File</label>
                  <input className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. work.md" />
                </div>
                <div>
                  <label className="text-sm text-text2 block mb-1">Tag</label>
                  <input className="input" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="e.g. work" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTask}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
