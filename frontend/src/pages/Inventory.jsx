import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { parseNum, formatQty, formatCurrency } from '../utils/formatters';
import { Boxes, Package, RefreshCw, AlertTriangle, Layers } from 'lucide-react';

export function Inventory({ refreshKey }) {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'products'
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [matData, invData] = await Promise.all([
        api.getMaterials().catch(() => []),
        api.getInventory().catch(() => ({ rawMaterials: [], products: [] })),
      ]);

      setMaterials(matData || []);
      setProducts(invData?.products || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Raw Materials Columns
  const materialColumns = [
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
      render: (val, row) => {
        const current = parseNum(val);
        const threshold = parseNum(row.reorder_threshold);
        const isLow = current <= threshold;

        return (
          <div className="flex items-center gap-2">
            <span className={`font-mono font-semibold ${isLow ? 'text-rose-400' : 'text-slate-100'}`}>
              {formatQty(val, row.unit)}
            </span>
            {isLow && (
              <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Below threshold
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Reorder Threshold',
      key: 'reorder_threshold',
      render: (val, row) => (
        <span className="font-mono text-xs text-slate-400">
          {formatQty(val, row.unit)}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      render: (_, row) => {
        const current = parseNum(row.current_stock);
        const threshold = parseNum(row.reorder_threshold);
        const isLow = current <= threshold;

        return (
          <Badge variant={isLow ? 'LOW' : 'OK'}>
            {isLow ? 'Low Stock' : 'Optimal'}
          </Badge>
        );
      },
    },
  ];

  // Finished Goods Columns
  const productColumns = [
    {
      header: 'ID',
      key: 'product_id',
      className: 'w-16 font-mono text-xs text-slate-500',
    },
    {
      header: 'Product Name',
      key: 'name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-100">{val}</span>
          {row.category && (
            <span className="ml-2 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-400">
              {row.category}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Available Stock',
      key: 'current_stock',
      render: (val) => {
        const current = parseNum(val);
        const isOutOfStock = current <= 0;

        return (
          <span className={`font-mono font-semibold ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatQty(val, 'units')}
          </span>
        );
      },
    },
    {
      header: 'Stock Status',
      key: 'status',
      align: 'center',
      render: (_, row) => {
        const current = parseNum(row.current_stock);
        if (current <= 0) return <Badge variant="CANCELLED">Out of Stock</Badge>;
        if (current < 20) return <Badge variant="PENDING">Low Quantity</Badge>;
        return <Badge variant="COMPLETED">In Stock</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Inventory Overview</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time dual-inventory tracking across Raw Materials and Finished Goods
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'materials'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Raw Materials ({materials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Finished Goods ({products.length})
          </button>
        </div>
      </div>

      {error && <AlertBanner variant="error" title="Error Loading Inventory" message={error} />}

      {/* Main Table */}
      {activeTab === 'materials' ? (
        <Table
          id="raw-materials-table"
          columns={materialColumns}
          data={materials}
          isLoading={loading}
          emptyMessage="No raw materials registered in PostgreSQL"
          keyField="material_id"
        />
      ) : (
        <Table
          id="products-inventory-table"
          columns={productColumns}
          data={products}
          isLoading={loading}
          emptyMessage="No finished goods found in database"
          keyField="product_id"
        />
      )}
    </div>
  );
}
