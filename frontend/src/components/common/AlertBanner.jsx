import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const VARIANTS = {
  warning: {
    container: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
  },
  error: {
    container: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
    icon: AlertCircle,
    iconColor: 'text-rose-400',
  },
  success: {
    container: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-400',
  },
  info: {
    container: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200',
    icon: Info,
    iconColor: 'text-indigo-400',
  },
};

export function AlertBanner({
  variant = 'warning',
  title,
  message,
  children,
  onDismiss,
  id,
}) {
  const config = VARIANTS[variant] || VARIANTS.warning;
  const Icon = config.icon;

  return (
    <div
      id={id}
      className={`flex items-start gap-3.5 p-4 rounded-xl border backdrop-blur-md ${config.container}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-sm font-semibold mb-1 text-slate-100">{title}</h4>}
        {message && <div className="text-xs leading-relaxed text-slate-300">{message}</div>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-lg transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
