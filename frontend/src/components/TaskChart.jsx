import React from 'react';

const seriesConfig = [
  { key: 'doneDay1', label: 'Done [x]', color: '#a6e3a1' },
  { key: 'doneDay2', label: 'Done [x2]', color: '#7ec87e' },
  { key: 'doneDay3', label: 'Done [x3]', color: '#5aad5a' },
  { key: 'grace', label: 'Grace [-]', color: '#f9e2af' },
  { key: 'failedTwice', label: 'Failed [--]', color: '#f38ba8' },
  { key: 'skipped', label: 'Skipped [+]', color: '#6c7086' },
  { key: 'pending', label: 'Pending [ ]', color: '#89b4fa' },
];

const timeRanges = ['Day', 'Week', 'Month', 'All'];

export default function TaskChart({ data, timeRange, onTimeRangeChange }) {
  const values = seriesConfig.map(s => data[s.key] || 0);
  const maxVal = Math.max(1, ...values);
  const width = 400;
  const height = 200;
  const barWidth = Math.max(20, (width - 80) / seriesConfig.length - 10);

  const barX = (i) => 50 + i * (barWidth + 12);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Task Distribution</h3>
        <div className="flex gap-1">
          {timeRanges.map(r => (
            <button
              key={r}
              onClick={() => onTimeRangeChange(r)}
              className={`text-xs px-2 py-1 rounded ${timeRange === r ? 'bg-accent text-bg' : 'text-text2 hover:text-text'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {seriesConfig.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-text2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height + 30}`} className="w-full" style={{ maxHeight: '230px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = 20 + 160 - pct * 160;
          return (
            <g key={pct}>
              <line x1={40} y1={y} x2={width - 20} y2={y} stroke="var(--border)" strokeWidth="0.5" />
              <text x={36} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="10">
                {Math.round(pct * maxVal)}
              </text>
            </g>
          );
        })}

        {seriesConfig.map((s, i) => {
          const val = data[s.key] || 0;
          const x = barX(i);
          const barH = (val / maxVal) * 160;
          const y = 20 + 160 - barH;
          return (
            <g key={s.key}>
              <rect x={x} y={y} width={barWidth} height={Math.max(barH, val > 0 ? 4 : 0)} rx="4" fill={s.color} fillOpacity="0.8" />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill={s.color} fontSize="11" fontWeight="600">
                {val}
              </text>
              <text x={x + barWidth / 2} y={height + 18} textAnchor="middle" fill="var(--muted)" fontSize="8">
                {s.label.includes('[') ? s.label.match(/\[.*?\]/)[0] : s.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
