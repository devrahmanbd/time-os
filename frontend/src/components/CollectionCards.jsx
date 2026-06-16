import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const presetColors = [
  '#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8',
  '#94e2d5', '#f5c2e7', '#cba6f7',
];

const defaultCollections = [
  { id: 1, emoji: '📝', title: 'Daily Notes', subtitle: 'Quick thoughts & ideas', color: '#89b4fa' },
  { id: 2, emoji: '⭐', title: 'Favorites', subtitle: 'Bookmarked items', color: '#f9e2af' },
  { id: 3, emoji: '🎯', title: 'Goals', subtitle: 'Long-term objectives', color: '#a6e3a1' },
  { id: 4, emoji: '📚', title: 'Reading List', subtitle: 'Books & articles', color: '#f5c2e7' },
];

export default function CollectionCards() {
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('mnemonic-cards');
    if (saved) try { return JSON.parse(saved); } catch {}
    return defaultCollections;
  });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ emoji: '📁', title: '', subtitle: '', color: '#89b4fa' });

  useEffect(() => {
    localStorage.setItem('mnemonic-cards', JSON.stringify(cards));
  }, [cards]);

  const openAdd = () => {
    setEditing(null);
    setForm({ emoji: '📁', title: '', subtitle: '', color: '#89b4fa' });
    setShowModal(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setForm({ emoji: card.emoji, title: card.title, subtitle: card.subtitle, color: card.color });
    setShowModal(true);
  };

  const saveCard = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setCards(cards.map(c => c.id === editing.id ? { ...c, ...form } : c));
    } else {
      setCards([...cards, { ...form, id: Date.now() }]);
    }
    setShowModal(false);
  };

  const deleteCard = (id) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const emojis = ['📝', '⭐', '🎯', '📚', '💡', '🎨', '🔬', '🌍', '🏆', '💻', '🎮', '📖', '✈️', '🎵', '📸', '📁'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collections</h2>
        <button onClick={openAdd} className="btn btn-secondary flex items-center gap-1 text-sm py-1.5 px-3">
          <Plus size={14} /> Add
        </button>
      </div>
      {cards.length === 0 ? (
        <div className="card text-center py-8 text-text2">
          <p>No collections yet. Click "Add" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {cards.map(card => (
            <div
              key={card.id}
              className="card card-hover group relative cursor-pointer"
              style={{ borderLeftColor: card.color, borderLeftWidth: 3 }}
            >
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(card)} className="p-1 rounded bg-surface2 hover:bg-border text-text2 hover:text-text">
                  <Pencil size={12} />
                </button>
                <button onClick={() => deleteCard(card.id)} className="p-1 rounded bg-surface2 hover:bg-border text-text2 hover:text-red">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-2xl mb-2">{card.emoji}</div>
              <h3 className="font-medium text-sm">{card.title}</h3>
              <p className="text-xs text-text2 mt-0.5">{card.subtitle}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} Collection</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-text2 block mb-1">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {emojis.map(e => (
                    <button
                      key={e}
                      onClick={() => setForm({ ...form, emoji: e })}
                      className={`text-xl p-1.5 rounded ${form.emoji === e ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-surface2'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-text2 block mb-1">Title</label>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Collection name" />
              </div>
              <div>
                <label className="text-sm text-text2 block mb-1">Subtitle</label>
                <input className="input" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Short description" />
              </div>
              <div>
                <label className="text-sm text-text2 block mb-1">Color Accent</label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCard}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
