import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 border-indigo-500/30',
  secondary:
    'bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600',
  success:
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 border-emerald-500/30',
  danger:
    'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-600/20 border-rose-500/30',
  outline:
    'bg-transparent hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white',
  ghost:
    'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border-transparent',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  id,
  type = 'button',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      id={id}
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium border transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
