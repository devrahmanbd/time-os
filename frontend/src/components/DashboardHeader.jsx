import React, { useState, useEffect } from 'react';
import { Clock, Sun, Moon, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Settings, Pencil } from 'lucide-react';

function getWeatherIcon(icon) {
  if (!icon) return Cloud;
  if (icon.includes('01')) return Sun;
  if (icon.includes('02') || icon.includes('03') || icon.includes('04')) return CloudSun;
  if (icon.includes('09') || icon.includes('10')) return CloudRain;
  if (icon.includes('11')) return CloudLightning;
  if (icon.includes('13')) return CloudSnow;
  if (icon.includes('50')) return CloudFog;
  return Cloud;
}

export default function DashboardHeader() {
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState({ notes: 0, open: 0, done: 0 });
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [showWeatherConfig, setShowWeatherConfig] = useState(false);
  const [weatherKey, setWeatherKey] = useState(() => localStorage.getItem('mnemonic-weather-key') || '');
  const [weatherCity, setWeatherCity] = useState(() => localStorage.getItem('mnemonic-weather-city') || 'London');
  const [title, setTitle] = useState(() => localStorage.getItem('mnemonic-title') || 'Mnemonic');
  const [mantra, setMantra] = useState(() => localStorage.getItem('mnemonic-mantra') || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingMantra, setEditingMantra] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = time.getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, [time]);

  useEffect(() => {
    const loaded = localStorage.getItem('mnemonic-stats');
    if (loaded) setStats(JSON.parse(loaded));
  }, []);

  useEffect(() => {
    if (!weatherKey) return;
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(weatherCity)}&appid=${weatherKey}&units=metric`
        );
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        setWeather({
          temp: Math.round(data.main.temp),
          desc: data.weather[0].description,
          icon: data.weather[0].icon,
          city: data.name,
        });
        setWeatherError(null);
      } catch (e) {
        setWeatherError(e.message);
        setWeather(null);
      }
    };
    fetchWeather();
    const t = setInterval(fetchWeather, 300000);
    return () => clearInterval(t);
  }, [weatherKey, weatherCity]);

  const saveWeatherConfig = () => {
    localStorage.setItem('mnemonic-weather-key', weatherKey);
    localStorage.setItem('mnemonic-weather-city', weatherCity);
    setShowWeatherConfig(false);
  };

  const saveTitle = (val) => {
    setTitle(val);
    localStorage.setItem('mnemonic-title', val);
    setEditingTitle(false);
  };

  const saveMantra = (val) => {
    setMantra(val);
    localStorage.setItem('mnemonic-mantra', val);
    setEditingMantra(false);
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.icon) : Cloud;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <input
                className="input text-2xl font-bold w-auto"
                defaultValue={title}
                onBlur={e => saveTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {title}
                <button onClick={() => setEditingTitle(true)} className="text-muted hover:text-text p-1">
                  <Pencil size={14} />
                </button>
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingMantra ? (
              <input
                className="input text-sm w-auto"
                defaultValue={mantra}
                onBlur={e => saveMantra(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveMantra(e.target.value)}
                autoFocus
              />
            ) : (
              <p className="text-text2 text-sm flex items-center gap-2">
                {mantra || 'Set your daily mantra...'}
                <button onClick={() => setEditingMantra(true)} className="text-muted hover:text-text p-1">
                  <Pencil size={12} />
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-text2">
            <Clock size={16} />
            <span className="font-mono text-lg tabular-nums">
              {time.toLocaleTimeString()}
            </span>
            <span className="text-sm text-muted">
              {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {weather ? (
            <div className="flex items-center gap-2 text-sm bg-surface2 rounded-lg px-3 py-1.5">
              <WeatherIcon size={16} className="text-yellow" />
              <span>{weather.temp}°C</span>
              <span className="text-muted">{weather.city}</span>
              <button onClick={() => setShowWeatherConfig(true)} className="text-muted hover:text-text">
                <Settings size={12} />
              </button>
            </div>
          ) : weatherError ? (
            <button
              onClick={() => setShowWeatherConfig(true)}
              className="text-sm text-muted hover:text-accent flex items-center gap-1"
            >
              <Settings size={14} /> Configure Weather
            </button>
          ) : (
            <button
              onClick={() => setShowWeatherConfig(true)}
              className="text-sm text-muted hover:text-accent flex items-center gap-1"
            >
              <Settings size={14} /> Add Weather API Key
            </button>
          )}
        </div>
      </div>

      {showWeatherConfig && (
        <div className="modal-overlay" onClick={() => setShowWeatherConfig(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Weather Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-text2 block mb-1">OpenWeatherMap API Key</label>
                <input
                  className="input"
                  value={weatherKey}
                  onChange={e => setWeatherKey(e.target.value)}
                  placeholder="Enter your API key"
                />
              </div>
              <div>
                <label className="text-sm text-text2 block mb-1">City</label>
                <input
                  className="input"
                  value={weatherCity}
                  onChange={e => setWeatherCity(e.target.value)}
                  placeholder="London"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowWeatherConfig(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveWeatherConfig}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface2 text-sm">
          <span className="text-muted">Notes</span>
          <span className="font-semibold text-accent">{stats.notes}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface2 text-sm">
          <span className="text-muted">Open</span>
          <span className="font-semibold text-yellow">{stats.open}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface2 text-sm">
          <span className="text-muted">Done</span>
          <span className="font-semibold text-green">{stats.done}</span>
        </div>
      </div>
    </div>
  );
}
