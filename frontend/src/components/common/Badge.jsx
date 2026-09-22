import React from 'react';

const STATUS_VARIANTS = {
  // Production / Order statuses
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  DISPATCHED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PLANNED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  IN_PROGRESS: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',

  // Stock log transaction types
  ORDER_FULFILLMENT: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  PRODUCTION_CONSUMPTION: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  PRODUCTION_OUTPUT: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  MANUAL_ADJUSTMENT: 'bg-purple-500/10 text-purple-300 border-purple-500/20',

  // General stock health
  OK: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  LOW: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  CRITICAL: 'bg-rose-600/20 text-rose-300 border-rose-500/40 animate-pulse',
};

export function Badge({ children, variant, size = 'sm', className = '' }) {
  const normalizedVariant = String(variant || children || '').toUpperCase();
  const style = STATUS_VARIANTS[normalizedVariant] || 'bg-slate-800 text-slate-300 border-slate-700';

  const sizeClasses = size === 'xs' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide uppercase ${style} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
}
