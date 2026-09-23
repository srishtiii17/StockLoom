import { apiRequest } from './client';

export const api = {
  // Health
  getHealth: () => apiRequest('/health'),

  // Suppliers
  getSuppliers: () => apiRequest('/api/suppliers'),

  // Raw Materials
  getMaterials: () => apiRequest('/api/materials'),

  // Products
  getProducts: () => apiRequest('/api/products'),
  createProduct: (payload) =>
    apiRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Inventory Overview
  getInventory: () => apiRequest('/api/inventory'),

  // Customers
  getCustomers: () => apiRequest('/api/customers'),

  // Production Batches
  getBatches: () => apiRequest('/api/batches'),
  createBatch: (payload) =>
    apiRequest('/api/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeBatch: (batchId, payload) =>
    apiRequest(`/api/batches/${batchId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Orders
  getOrders: () => apiRequest('/api/orders'),
  getOrder: (orderId) => apiRequest(`/api/orders/${orderId}`),
  createOrder: (payload) =>
    apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Dispatches
  getDispatches: () => apiRequest('/api/dispatches'),
  createDispatch: (payload) =>
    apiRequest('/api/dispatches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Audit Logs
  getStockLogs: (limit = 100) => apiRequest(`/api/stock-logs?limit=${limit}`),

  // Reports
  getLowStockReport: () => apiRequest('/api/reports/low-stock'),
  getMaterialConsumptionReport: () => apiRequest('/api/reports/material-consumption'),
};
