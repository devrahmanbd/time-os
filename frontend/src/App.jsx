import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import TasksPage from './pages/TasksPage';
import PomodoroPage from './pages/PomodoroPage';
import WaterPage from './pages/WaterPage';
import ChannelsPage from './pages/ChannelsPage';
import SettingsPage from './pages/SettingsPage';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'tasks', label: 'Tasks', icon: 'CheckSquare' },
  { id: 'pomodoro', label: 'Pomodoro', icon: 'Timer' },
  { id: 'water', label: 'Water', icon: 'Droplets' },
  { id: 'channels', label: 'Channels', icon: 'Radio' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

function TabIcon({ name, size }) {
  const [icon, setIcon] = useState(null);
  useEffect(() => {
    import('lucide-react').then(mod => {
      const comp = mod[name];
      if (comp) setIcon(() => comp);
    });
  }, [name]);
  return icon ? React.createElement(icon, { size: size || 18 }) : null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('mnemonic-theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('mnemonic-theme', theme);
  }, [theme]);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <TasksPage />;
      case 'pomodoro': return <PomodoroPage />;
      case 'water': return <WaterPage />;
      case 'channels': return <ChannelsPage />;
      case 'settings': return <SettingsPage theme={theme} setTheme={setTheme} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="glass sticky top-0 z-50 px-4 py-2 flex items-center gap-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-accent bg-accent/10'
                : 'text-text2 hover:text-text hover:bg-surface/50'
            }`}
          >
            <TabIcon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderTab()}
      </main>
    </div>
  );
}
