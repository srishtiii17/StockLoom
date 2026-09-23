import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function Layout({ activePage, onNavigate, onRefresh, isRefreshing, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          onNavigate(page);
          setMobileSidebarOpen(false);
        }}
        className="hidden md:flex"
      />

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 z-10">
            <Sidebar
              activePage={activePage}
              onNavigate={(page) => {
                onNavigate(page);
                setMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activePage={activePage}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          isMobileSidebarOpen={mobileSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
