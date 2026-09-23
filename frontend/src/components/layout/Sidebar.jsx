import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Package,
  Factory,
  Users,
  ShoppingCart,
  Send,
  BarChart3,
  History,
  Layers,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'batches', label: 'Production Batches', icon: Factory },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'dispatch', label: 'Dispatch', icon: Send },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'audit-logs', label: 'Stock Audit Logs', icon: History },
];

export function Sidebar({ activePage, onNavigate, className = '' }) {
  return (
    <aside
      className={`w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-screen ${className}`}
    >
      {/* Brand Logo & Name */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-lg shadow-indigo-500/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            StockLoom
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              DBMS
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">Manufacturing & Orders</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>DBMS Project</span>
          <span className="font-mono text-slate-400">v1.0.0</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-600">ACID & Concurrency Verified</p>
      </div>
    </aside>
  );
}
