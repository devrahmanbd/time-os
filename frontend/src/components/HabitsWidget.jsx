import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const defaultHabits = [
  { id: 1, name: 'Exercise' },
  { id: 2, name: 'Read' },
  { id: 3, name: 'Meditate' },
];

function getWeekDates() {
  const dates = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitsWidget() {
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('mnemonic-habits');
    if (saved) try { return JSON.parse(saved); } catch {}
    return defaultHabits;
  });
  const [tracking, setTracking] = useState(() => {
    const saved = localStorage.getItem('mnemonic-habit-tracking');
    return saved ? JSON.parse(saved) : {};
  });
  const [weekDates, setWeekDates] = useState(getWeekDates());
  const [contextMenu, setContextMenu] = useState(null);
  const [newHabitName, setNewHabitName] = useState('');

  useEffect(() => {
    localStorage.setItem('mnemonic-habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('mnemonic-habit-tracking', JSON.stringify(tracking));
  }, [tracking]);

  const toggleDay = (habitId, date) => {
    const key = `${habitId}-${date}`;
    setTracking(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    setHabits([...habits, { id: Date.now(), name: newHabitName.trim() }]);
    setNewHabitName('');
  };

  const deleteHabit = (id) => {
    setHabits(habits.filter(h => h.id !== id));
    const newTracking = {};
    for (const key in tracking) {
      if (!key.startsWith(`${id}-`)) newTracking[key] = tracking[key];
    }
    setTracking(newTracking);
    setContextMenu(null);
  };

  const totalSlots = habits.length * 7;
  const filled = habits.reduce((sum, h) => {
    return sum + weekDates.filter(d => tracking[`${h.id}-${d}`]).length;
  }, 0);
  const bioPct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Habits</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-muted font-medium pb-1 pr-2">Habit</th>
              {dayLabels.map(d => (
                <th key={d} className="text-center text-muted font-medium pb-1 px-1">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map(habit => (
              <tr key={habit.id}>
                <td
                  className="py-1.5 pr-2 text-sm truncate max-w-[100px]"
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu(contextMenu === habit.id ? null : habit.id);
                  }}
                >
                  <span className="cursor-context-menu">{habit.name}</span>
                  {contextMenu === habit.id && (
                    <div className="absolute z-50 bg-surface border border-border rounded-lg shadow-lg py-1">
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red hover:bg-surface2 w-full"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </td>
                {weekDates.map(d => {
                  const checked = tracking[`${habit.id}-${d}`];
                  return (
                    <td key={d} className="text-center py-1.5 px-1">
                      <button
                        onClick={() => toggleDay(habit.id, d)}
                        className={`w-5 h-5 rounded-full transition-all ${
                          checked ? 'bg-accent shadow-sm shadow-accent/30' : 'bg-surface2 hover:bg-border'
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <input
          className="input text-sm flex-1"
          value={newHabitName}
          onChange={e => setNewHabitName(e.target.value)}
          placeholder="New habit..."
          onKeyDown={e => e.key === 'Enter' && addHabit()}
        />
        <button onClick={addHabit} className="btn btn-secondary p-1.5">
          <Plus size={14} />
        </button>
      </div>

      <div className="pt-1">
        <div className="flex justify-between text-xs text-text2 mb-1">
          <span>Bio</span>
          <span>{bioPct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill bg-teal" style={{ width: `${bioPct}%` }} />
        </div>
      </div>
    </div>
  );
}
