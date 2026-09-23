import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { AlertBanner } from '../components/common/AlertBanner';
import { parseNum, formatDateTime } from '../utils/formatters';
import { History, TrendingDown, TrendingUp, Filter, Search, Terminal } from 'lucide-react';

export function StockAuditLogs({ refreshKey }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(100);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStockLogs(limit);
      setLogs(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load stock audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [limit, refreshKey]);

  // Filter logs by type and search term
  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === 'ALL' || log.change_type === filterType;
    const targetName = (log.product_name || log.material_name || '').toLowerCase();
    const trigger = (log.triggered_by || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || targetName.includes(query) || trigger.includes(query);
    return matchesType && matchesSearch;
  });

  const columns = [
    {
      header: 'Log ID',
      key: 'log_id',
      className: 'w-20 font-mono text-xs text-slate-500',
      render: (val) => `#${val}`,
    },
    {
      header: 'Target Inventory Item',
      key: 'target',
      render: (_, row) => {
        const isProduct = row.product_id !== null && row.product_id !== undefined;
        const name = isProduct ? row.product_name || `Product #${row.product_id}` : row.material_name || `Material #${row.material_id}`;

        return (
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                isProduct
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {isProduct ? 'Product' : 'Material'}
            </span>
            <span className="font-semibold text-slate-200">{name}</span>
          </div>
        );
      },
    },
    {
      header: 'Stock Delta',
      key: 'change_qty',
      align: 'right',
      render: (val) => {
        const num = parseNum(val);
        const isNegative = num < 0;
        return (
          <div className="flex items-center justify-end gap-1.5 font-mono font-semibold">
            {isNegative ? (
              <span className="text-rose-400 inline-flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> {val}
              </span>
            ) : (
              <span className="text-emerald-400 inline-flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{val}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Transaction Type',
      key: 'change_type',
      align: 'center',
      render: (val) => <Badge variant={val}>{val}</Badge>,
    },
    {
      header: 'Database Trigger / Origin',
      key: 'triggered_by',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <Terminal className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span>{val}</span>
        </div>
      ),
    },
    {
      header: 'Timestamp',
      key: 'timestamp',
      render: (val) => (
        <span className="text-xs text-slate-400 font-mono">
          {formatDateTime(val)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Stock Audit Logs</h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit records created exclusively by PostgreSQL triggers during order & batch operations
          </p>
        </div>

        {/* Limit Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Limit:</span>
          <select
            id="audit-log-limit-select"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="50">50 entries</option>
            <option value="100">100 entries</option>
            <option value="250">250 entries</option>
            <option value="500">500 entries</option>
          </select>
        </div>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      {/* Filter and Search Bar */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <select
            id="audit-log-type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="ORDER_FULFILLMENT">ORDER_FULFILLMENT</option>
            <option value="PRODUCTION_CONSUMPTION">PRODUCTION_CONSUMPTION</option>
            <option value="PRODUCTION_OUTPUT">PRODUCTION_OUTPUT</option>
            <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="audit-log-search-input"
            type="text"
            placeholder="Search item or trigger name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <Table
        id="stock-audit-logs-table"
        columns={columns}
        data={filteredLogs}
        isLoading={loading}
        emptyMessage="No stock audit logs match the current filter"
        emptySubtext="Stock logs are automatically populated by PostgreSQL triggers."
        keyField="log_id"
      />
    </div>
  );
}
