import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { StatCard } from '../components/common/StatCard';
import { AlertBanner } from '../components/common/AlertBanner';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { parseNum, formatCurrency, formatQty, formatDateTime } from '../utils/formatters';
import {
  Boxes,
  Package,
  AlertTriangle,
  Factory,
  ShoppingCart,
  Send,
  History,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export function Dashboard({ onNavigate, refreshKey }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState({ rawMaterials: [], products: [] });
  const [lowStockMaterials, setLowStockMaterials] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invData, lowStockData, logsData, batchesData, ordersData] = await Promise.all([
        api.getInventory().catch(() => ({ rawMaterials: [], products: [] })),
        api.getLowStockReport().catch(() => []),
        api.getStockLogs(6).catch(() => []),
        api.getBatches().catch(() => []),
        api.getOrders().catch(() => []),
      ]);

      setInventory(invData || { rawMaterials: [], products: [] });
      setLowStockMaterials(lowStockData || []);
      setRecentLogs(logsData || []);
      setBatches(batchesData || []);
      setOrders(ordersData || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const rawMaterials = inventory.rawMaterials || [];
  const products = inventory.products || [];
  const activeBatchesCount = batches.filter((b) => b.status === 'PLANNED' || b.status === 'IN_PROGRESS').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Error */}
      {error && (
        <AlertBanner
          variant="error"
          title="Backend Connection Error"
          message={error}
        />
      )}

      {/* Low Stock Warning Banner */}
      {lowStockMaterials.length > 0 && (
        <AlertBanner
          variant="warning"
          title={`Low Stock Alert: ${lowStockMaterials.length} Raw Material(s) Below Reorder Threshold`}
          message={
            <span>
              Triggered via stored function <code className="font-mono text-amber-300">fn_materials_below_reorder()</code>. Immediate replenishment recommended.
            </span>
          }
        >
          <div className="mt-3 flex flex-wrap gap-2">
            {lowStockMaterials.map((m) => (
              <span
                key={m.material_id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-xs border border-amber-500/40"
              >
                <strong>{m.name}:</strong> {formatQty(m.current_stock, m.unit)} (threshold: {formatQty(m.reorder_threshold, m.unit)})
              </span>
            ))}
          </div>
        </AlertBanner>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-products"
          title="Finished Goods"
          value={loading ? '...' : products.length}
          subtitle="Active product catalog"
          icon={Package}
          color="indigo"
          trend={
            <span className="text-slate-400">
              Total stock: <strong className="text-slate-200">{products.reduce((acc, p) => acc + parseNum(p.current_stock), 0)} units</strong>
            </span>
          }
        />
        <StatCard
          id="stat-materials"
          title="Raw Materials"
          value={loading ? '...' : rawMaterials.length}
          subtitle="Inventory commodities"
          icon={Boxes}
          color="blue"
          trend={
            <span className={lowStockMaterials.length > 0 ? 'text-amber-400 font-medium' : 'text-emerald-400'}>
              {lowStockMaterials.length > 0 ? `${lowStockMaterials.length} below threshold` : 'All stock levels healthy'}
            </span>
          }
        />
        <StatCard
          id="stat-batches"
          title="Active Batches"
          value={loading ? '...' : activeBatchesCount}
          subtitle="In production queue"
          icon={Factory}
          color="amber"
          trend={
            <span className="text-slate-400">
              Total planned: <strong className="text-slate-200">{batches.length}</strong>
            </span>
          }
        />
        <StatCard
          id="stat-pending-orders"
          title="Pending Orders"
          value={loading ? '...' : pendingOrdersCount}
          subtitle="Awaiting fulfillment/dispatch"
          icon={ShoppingCart}
          color="emerald"
          trend={
            <span className="text-slate-400">
              Total orders: <strong className="text-slate-200">{orders.length}</strong>
            </span>
          }
        />
      </div>

      {/* Quick Action Shortcuts */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Quick Workflow Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            id="quick-order-btn"
            variant="primary"
            icon={ShoppingCart}
            onClick={() => onNavigate('orders')}
            className="w-full justify-start text-xs sm:text-sm"
          >
            Create Order
          </Button>
          <Button
            id="quick-batch-btn"
            variant="secondary"
            icon={Factory}
            onClick={() => onNavigate('batches')}
            className="w-full justify-start text-xs sm:text-sm"
          >
            Plan Production
          </Button>
          <Button
            id="quick-dispatch-btn"
            variant="secondary"
            icon={Send}
            onClick={() => onNavigate('dispatch')}
            className="w-full justify-start text-xs sm:text-sm"
          >
            Record Dispatch
          </Button>
          <Button
            id="quick-logs-btn"
            variant="secondary"
            icon={History}
            onClick={() => onNavigate('audit-logs')}
            className="w-full justify-start text-xs sm:text-sm"
          >
            Stock Audit Logs
          </Button>
        </div>
      </div>

      {/* Two Column Section: Recent Production Batches & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Batches */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Recent Production Batches</h3>
                <p className="text-xs text-slate-400">Manufacturing lifecycle updates</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('batches')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {batches.slice(0, 4).map((batch) => (
                <div
                  key={batch.batch_id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-200">
                      Batch #{batch.batch_id} — {batch.product_name || `Product #${batch.product_id}`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Started: {batch.start_date || 'N/A'} • Output: {batch.quantity_produced ? `${batch.quantity_produced} units` : 'In progress'}
                    </div>
                  </div>
                  <Badge variant={batch.status}>{batch.status}</Badge>
                </div>
              ))}
              {batches.length === 0 && !loading && (
                <div className="py-8 text-center text-xs text-slate-500">No production batches yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Audit Trail */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Live Database Audit Trail</h3>
                <p className="text-xs text-slate-400">Stock changes recorded by database triggers</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('audit-logs')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                View logs <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {recentLogs.slice(0, 4).map((log) => {
                const isNegative = parseNum(log.change_qty) < 0;
                const targetName = log.product_name || log.material_name || `Item #${log.product_id || log.material_id}`;

                return (
                  <div
                    key={log.log_id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg border ${
                          isNegative
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {isNegative ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{targetName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {log.triggered_by} • {formatDateTime(log.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-semibold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {parseNum(log.change_qty) > 0 ? `+${log.change_qty}` : log.change_qty}
                      </div>
                      <Badge variant={log.change_type} size="xs" className="mt-0.5">
                        {log.change_type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {recentLogs.length === 0 && !loading && (
                <div className="py-8 text-center text-xs text-slate-500">No stock audit records found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
