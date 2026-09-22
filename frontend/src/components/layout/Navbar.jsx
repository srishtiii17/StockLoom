import React, { useState, useEffect } from 'react';
import { api } from '../../api/services';
import { RefreshCw, Activity, Menu, X } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';

export function Navbar({ activePage, onRefresh, isRefreshing, onToggleMobileSidebar, isMobileSidebarOpen }) {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'online', 'offline'

  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      if (res && res.status === 'ok') {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const currentPage = NAV_ITEMS.find((item) => item.id === activePage);

  return (
    <header className="h-16 bg-slate-900/60 border-b border-slate-800 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          aria-label="Toggle navigation menu"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {currentPage?.label || 'Overview'}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Backend Status Indicator */}
        <div
          id="backend-health-indicator"
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-slate-950/60 transition-colors"
          title={`Backend status: ${backendStatus}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus === 'online'
                ? 'bg-emerald-400 animate-pulse'
                : backendStatus === 'offline'
                ? 'bg-rose-500'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <span
            className={`${
              backendStatus === 'online'
                ? 'text-emerald-400'
                : backendStatus === 'offline'
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {backendStatus === 'online'
              ? 'PostgreSQL API Online'
              : backendStatus === 'offline'
              ? 'API Disconnected'
              : 'Checking API...'}
          </span>
        </div>

        {/* Global Refresh Button */}
        {onRefresh && (
          <button
            id="global-refresh-btn"
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh current page data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}
