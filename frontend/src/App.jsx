import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Products } from './pages/Products';
import { ProductionBatches } from './pages/ProductionBatches';
import { Orders } from './pages/Orders';
import { Dispatches } from './pages/Dispatches';
import { Suppliers } from './pages/Suppliers';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { StockAuditLogs } from './pages/StockAuditLogs';

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} refreshKey={refreshKey} />;
      case 'inventory':
        return <Inventory refreshKey={refreshKey} />;
      case 'products':
        return <Products refreshKey={refreshKey} />;
      case 'batches':
        return <ProductionBatches refreshKey={refreshKey} />;
      case 'orders':
        return <Orders refreshKey={refreshKey} />;
      case 'dispatch':
        return <Dispatches refreshKey={refreshKey} />;
      case 'suppliers':
        return <Suppliers refreshKey={refreshKey} />;
      case 'customers':
        return <Customers refreshKey={refreshKey} />;
      case 'reports':
        return <Reports refreshKey={refreshKey} />;
      case 'audit-logs':
        return <StockAuditLogs refreshKey={refreshKey} />;
      default:
        return <Dashboard onNavigate={setActivePage} refreshKey={refreshKey} />;
    }
  };

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      {renderActivePage()}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
