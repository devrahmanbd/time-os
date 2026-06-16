import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function GoalCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [goal, setGoal] = useState(() => localStorage.getItem('mnemonic-goal') || '');
  const [editingGoal, setEditingGoal] = useState(false);
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('mnemonic-calendar-notes');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    localStorage.setItem('mnemonic-calendar-notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('mnemonic-goal', goal);
  }, [goal]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const key = `${year}-${month}-${day}`;
    setSelectedDay(key);
    setNoteText(notes[key] || '');
  };

  const saveNote = () => {
    if (!selectedDay) return;
    if (noteText.trim()) {
      setNotes({ ...notes, [selectedDay]: noteText.trim() });
    } else {
      const copy = { ...notes };
      delete copy[selectedDay];
      setNotes(copy);
    }
    setSelectedDay(null);
    setNoteText('');
  };

  const deleteNote = () => {
    if (!selectedDay) return;
    const copy = { ...notes };
    delete copy[selectedDay];
    setNotes(copy);
    setSelectedDay(null);
    setNoteText('');
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Daily Goal</h2>

      <div className="card">
        <div className="flex items-center gap-2">
          {editingGoal ? (
            <input
              className="input text-sm"
              defaultValue={goal}
              onBlur={e => { setGoal(e.target.value); setEditingGoal(false); }}
              onKeyDown={e => e.key === 'Enter' && (setGoal(e.target.value), setEditingGoal(false))}
              autoFocus
            />
          ) : (
            <p className="text-sm text-text2 flex-1 flex items-center gap-2">
              {goal || 'Set a daily goal...'}
              <button onClick={() => setEditingGoal(true)} className="text-muted hover:text-text">
                <Pencil size={12} />
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 hover:bg-surface2 rounded text-text2">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium">{monthNames[month]} {year}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-surface2 rounded text-text2">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {days.map((day, i) => {
            const key = day ? `${year}-${month}-${day}` : null;
            const hasNote = key && notes[key];
            const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
            return (
              <button
                key={i}
                onClick={() => handleDayClick(day)}
                className={`py-1.5 rounded relative ${
                  day ? 'hover:bg-surface2 cursor-pointer' : ''
                } ${isToday ? 'ring-1 ring-accent' : ''} ${
                  selectedDay === key ? 'bg-accent/20' : ''
                }`}
              >
                <span>{day}</span>
                {hasNote && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Note for {selectedDay}</h3>
            <textarea
              className="input min-h-[100px] mt-3 resize-none"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Write your note..."
            />
            <div className="flex justify-between mt-4">
              <button className="btn text-red hover:bg-red/10" onClick={deleteNote}>Delete</button>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => setSelectedDay(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveNote}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
