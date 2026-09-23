import React from 'react';

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
  id,
}) {
  const COLOR_MAP = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  const badgeStyle = COLOR_MAP[color] || COLOR_MAP.indigo;

  return (
    <div
      id={id}
      className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1.5 tracking-tight font-sans">
            {value}
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${badgeStyle} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center text-xs text-slate-400">
          {trend}
        </div>
      )}
    </div>
  );
}
