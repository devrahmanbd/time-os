import React, { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '../api';
import TaskChart from './TaskChart';
import { ArrowUp, RotateCw, AlertCircle } from 'lucide-react';

const doneMarkers = ['x', 'x2', 'x3'];

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

function upgradeMarker(marker) {
  if (marker === ' ') return '-';
  if (marker === '-') return '--';
  if (marker === '--') return '--';
  if (marker === '+') return '+';
  if (doneMarkers.includes(marker)) return marker;
  return marker;
}

const sampleTasks = [
  { id: 1, title: 'Review project proposal', marker: ' ', source: 'work.md', tag: 'work', date: new Date().toISOString().slice(0,10), failed_count: 0 },
  { id: 2, title: 'Update dependencies', marker: '-', source: 'dev.md', tag: 'dev', date: new Date().toISOString().slice(0,10), failed_count: 1 },
  { id: 3, title: 'Write unit tests', marker: 'x', source: 'testing.md', tag: 'qa', date: new Date().toISOString().slice(0,10), failed_count: 0 },
  { id: 4, title: 'Design new feature', marker: ' ', source: 'product.md', tag: 'product', date: new Date().toISOString().slice(0,10), failed_count: 0 },
  { id: 5, title: 'Fix login bug', marker: '--', source: 'bugs.md', tag: 'urgent', date: new Date().toISOString().slice(0,10), failed_count: 2 },
  { id: 6, title: 'Deploy to staging', marker: '+', source: 'ops.md', tag: 'devops', date: new Date().toISOString().slice(0,10), failed_count: 0 },
  { id: 7, title: 'Refactor auth module', marker: 'x2', source: 'auth.md', tag: 'security', date: new Date().toISOString().slice(0,10), failed_count: 1 },
  { id: 8, title: 'Setup monitoring', marker: 'x3', source: 'ops.md', tag: 'devops', date: new Date().toISOString().slice(0,10), failed_count: 2 },
];

export default function TodayTasks() {
  const [tasks, setTasks] = useState(sampleTasks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('Week');

  useEffect(() => {
    fetchTasks();
  }, []);

  const getTodayDate = () => {
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return String(d.getDate()).padStart(2,'0') + '-' + months[d.getMonth()];
  };

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/tasks?date=' + getTodayDate());
      if (data && data.length > 0) setTasks(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const persistMarker = async (id, marker, failedCount) => {
    try {
      await apiPatch(`/tasks/${id}`, { marker, failed_count: failedCount });
    } catch (e) {
      console.error('Failed to persist marker:', e);
    }
  };

  const toggleDone = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (doneMarkers.includes(t.marker)) {
        persistMarker(id, ' ', 0);
        return { ...t, marker: ' ', failed_count: 0 };
      }
      let next, nextFailed;
      if (t.marker === ' ') { next = 'x'; nextFailed = 0; }
      else if (t.marker === '-') { next = 'x2'; nextFailed = 1; }
      else if (t.marker === '--') { next = 'x3'; nextFailed = 2; }
      else { next = 'x'; nextFailed = 0; }
      persistMarker(id, next, nextFailed);
      return { ...t, marker: next, failed_count: nextFailed };
    }));
  };

  const moveUncompleted = () => {
    setTasks(prev => prev.map(t => {
      const newMarker = upgradeMarker(t.marker);
      let newFailed = t.failed_count || 0;
      if (t.marker === ' ' && newMarker === '-') newFailed = 1;
      else if (t.marker === '-' && newMarker === '--') newFailed = 2;
      if (newMarker !== t.marker) {
        persistMarker(t.id, newMarker, newFailed);
      }
      return { ...t, marker: newMarker, failed_count: newFailed };
    }));
  };

  const done = tasks.filter(t => doneMarkers.includes(t.marker)).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const seriesData = {
    doneDay1: tasks.filter(t => t.marker === 'x').length,
    doneDay2: tasks.filter(t => t.marker === 'x2').length,
    doneDay3: tasks.filter(t => t.marker === 'x3').length,
    grace: tasks.filter(t => t.marker === '-').length,
    failedTwice: tasks.filter(t => t.marker === '--').length,
    skipped: tasks.filter(t => t.marker === '+').length,
    pending: tasks.filter(t => t.marker === ' ').length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Today's Tasks</h2>
        <div className="flex items-center gap-2">
          <button onClick={moveUncompleted} className="btn btn-secondary flex items-center gap-1 text-sm py-1.5 px-3">
            <ArrowUp size={14} /> Move Uncompleted
          </button>
          <button onClick={fetchTasks} className="btn btn-secondary p-1.5" title="Refresh">
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm text-text2">
          <span>{done}/{total} done</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill bg-green" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-text2 px-1">
        <span className="text-muted font-medium">Lifecycle:</span>
        <span className="font-mono text-muted">[ ]</span><span className="text-muted">→</span>
        <span className="font-mono text-yellow">[-]</span><span className="text-muted">→</span>
        <span className="font-mono text-red">[--]</span>
        <span className="text-muted mx-1">|</span>
        <span className="font-mono text-text2">[+]</span>
        <span className="text-muted mx-1">Skipped</span>
        <span className="text-muted mx-1">|</span>
        <div className="flex items-center gap-1">
          <span className="font-mono text-green">[x]</span>
          <span className="text-muted">D1</span>
          <span className="font-mono text-green">[x2]</span>
          <span className="text-muted">D2</span>
          <span className="font-mono text-green">[x3]</span>
          <span className="text-muted">D3</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-yellow bg-yellow/10 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          <span>Backend offline — showing sample data. Error: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1">
          {tasks.length === 0 ? (
            <div className="card text-center py-6 text-text2">
              <p>No tasks for today.</p>
            </div>
          ) : (
            tasks.map(task => {
              const ml = markerLabel(task.marker);
              return (
                <div
                  key={task.id}
                  className="card flex items-center gap-3 py-2.5 px-3 card-hover"
                >
                  <button
                    onClick={() => toggleDone(task.id)}
                    className={`font-mono text-sm ${ml.color} hover:opacity-80 min-w-[36px] text-center`}
                  >
                    {ml.text}
                  </button>
                  <span className={`flex-1 text-sm ${doneMarkers.includes(task.marker) ? 'line-through text-text2' : ''}`}>
                    {task.title}
                  </span>
                  <span className="text-xs text-muted">{task.source}</span>
                  {task.failed_count > 0 && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${task.failed_count >= 2 ? 'bg-red/20 text-red' : 'bg-yellow/20 text-yellow'}`}>
                      x{task.failed_count}
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface2 text-text2">{task.tag}</span>
                </div>
              );
            })
          )}
        </div>

        <div>
          <TaskChart data={seriesData} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
        </div>
      </div>
    </div>
  );
}
