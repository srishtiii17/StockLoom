import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { AlertBanner } from '../components/common/AlertBanner';
import { parseNum, formatQty, formatDate } from '../utils/formatters';
import { BarChart3, AlertTriangle, FileText, Code2, Database } from 'lucide-react';

export function Reports({ refreshKey }) {
  const [activeTab, setActiveTab] = useState('low-stock'); // 'low-stock' | 'consumption'
  const [loading, setLoading] = useState(true);
  const [lowStockData, setLowStockData] = useState([]);
  const [consumptionData, setConsumptionData] = useState([]);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lowStock, consumption] = await Promise.all([
        api.getLowStockReport(),
        api.getMaterialConsumptionReport(),
      ]);
      setLowStockData(lowStock || []);
      setConsumptionData(consumption || []);
    } catch (err) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Low Stock Stored Function Columns
  const lowStockColumns = [
    {
      header: 'ID',
      key: 'material_id',
      className: 'w-16 font-mono text-xs text-slate-500',
    },
    {
      header: 'Material Name',
      key: 'name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-100">{val}</span>
          <span className="ml-2 text-xs text-slate-500 font-mono">({row.unit})</span>
        </div>
      ),
    },
    {
      header: 'Current Stock',
      key: 'current_stock',
      render: (val, row) => (
        <span className="font-mono font-semibold text-rose-400">
          {formatQty(val, row.unit)}
        </span>
      ),
    },
    {
      header: 'Reorder Threshold',
      key: 'reorder_threshold',
      render: (val, row) => (
        <span className="font-mono text-slate-400">
          {formatQty(val, row.unit)}
        </span>
      ),
    },
    {
      header: 'Shortfall Deficit',
      key: 'deficit',
      render: (_, row) => {
        const diff = parseNum(row.reorder_threshold) - parseNum(row.current_stock);
        return (
          <span className="font-mono font-semibold text-amber-400">
            -{formatQty(diff > 0 ? diff : 0, row.unit)}
          </span>
        );
      },
    },
    {
      header: 'Alert Level',
      key: 'alert',
      align: 'center',
      render: () => <Badge variant="LOW">REORDER REQUIRED</Badge>,
    },
  ];

  // Material Consumption View Columns
  const consumptionColumns = [
    {
      header: 'Batch ID',
      key: 'batch_id',
      className: 'w-24 font-mono text-xs text-slate-400 font-semibold',
      render: (val) => `#${val}`,
    },
    {
      header: 'Finished Product',
      key: 'product_name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-100">{val || `Product #${row.product_id}`}</span>
        </div>
      ),
    },
    {
      header: 'Raw Material Consumed',
      key: 'material_name',
      render: (val) => <span className="text-slate-200">{val}</span>,
    },
    {
      header: 'Quantity Used',
      key: 'quantity_used',
      align: 'right',
      render: (val, row) => (
        <span className="font-mono font-semibold text-indigo-400">
          {formatQty(val, row.unit)}
        </span>
      ),
    },
    {
      header: 'Batch Status',
      key: 'batch_status',
      align: 'center',
      render: (val) => <Badge variant={val}>{val}</Badge>,
    },
    {
      header: 'Start Date',
      key: 'start_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'Completion Date',
      key: 'end_date',
      render: (val) => formatDate(val),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Database Reports & Views</h2>
          <p className="text-xs text-slate-400 mt-1">
            Visual demonstrations of PostgreSQL Stored Functions and Views
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('low-stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'low-stock'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Alerts ({lowStockData.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('consumption')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'consumption'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Material Consumption ({consumptionData.length})
          </button>
        </div>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      {/* SQL Concept Explanation Card */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Code2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">
            {activeTab === 'low-stock'
              ? 'PostgreSQL Stored Function: fn_materials_below_reorder()'
              : 'PostgreSQL Database View: v_batch_material_consumption'}
          </span>
          <p className="mt-0.5 text-[11px] leading-relaxed">
            {activeTab === 'low-stock'
              ? 'This report executes a server-side PostgreSQL function that scans RawMaterial where current_stock <= reorder_threshold. The database engine calculates thresholds directly, preventing application-level race conditions.'
              : 'This view joins ProductionBatch, BatchMaterialUsage, Product, and RawMaterial to provide aggregate material consumption analytics across the manufacturing lifecycle.'}
          </p>
        </div>
      </div>

      {/* Tab Data Table */}
      {activeTab === 'low-stock' ? (
        <Table
          id="low-stock-report-table"
          columns={lowStockColumns}
          data={lowStockData}
          isLoading={loading}
          emptyMessage="No materials currently below reorder threshold"
          emptySubtext="All raw material inventory levels are healthy."
          keyField="material_id"
        />
      ) : (
        <Table
          id="consumption-report-table"
          columns={consumptionColumns}
          data={consumptionData}
          isLoading={loading}
          emptyMessage="No material consumption records found"
          keyField="batch_id"
        />
      )}
    </div>
  );
}
