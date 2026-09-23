import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AlertBanner } from '../components/common/AlertBanner';
import { useToast } from '../context/ToastContext';
import { formatDate, parseNum } from '../utils/formatters';
import { Factory, Plus, CheckCircle, Trash2, AlertTriangle, Layers } from 'lucide-react';

export function ProductionBatches({ refreshKey }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState(null);

  // Create Batch Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [materialsList, setMaterialsList] = useState([]);

  // Complete Batch Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingBatch, setCompletingBatch] = useState(null);
  const [completeQty, setCompleteQty] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [batchData, prodData, matData] = await Promise.all([
        api.getBatches(),
        api.getProducts().catch(() => []),
        api.getMaterials().catch(() => []),
      ]);
      setBatches(batchData || []);
      setProducts(prodData || []);
      setMaterials(matData || []);
    } catch (err) {
      setError(err.message || 'Failed to load production batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Handle Material rows in Create Modal
  const addMaterialRow = () => {
    if (materials.length === 0) return;
    setMaterialsList((prev) => [
      ...prev,
      { material_id: materials[0].material_id, quantity_used: 1 },
    ]);
  };

  const removeMaterialRow = (index) => {
    setMaterialsList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMaterialRow = (index, field, value) => {
    setMaterialsList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!selectedProductId) {
      setCreateError('Please select a product for this batch');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        product_id: parseInt(selectedProductId, 10),
        start_date: startDate || undefined,
        materials: materialsList.map((m) => ({
          material_id: parseInt(m.material_id, 10),
          quantity_used: parseFloat(m.quantity_used) || 0,
        })),
      };

      await api.createBatch(payload);
      showSuccess('Production batch created in PLANNED status');
      setIsCreateModalOpen(false);
      setSelectedProductId('');
      setMaterialsList([]);
      loadData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create batch');
      showError(err.message || 'Batch creation failed');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenCompleteModal = (batch) => {
    setCompletingBatch(batch);
    setCompleteQty('');
    setCompleteError(null);
    setIsCompleteModalOpen(true);
  };

  const handleCompleteBatch = async (e) => {
    e.preventDefault();
    setCompleteError(null);

    const qty = parseFloat(completeQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setCompleteError('Quantity produced must be greater than 0');
      return;
    }

    setCompleting(true);
    try {
      await api.completeBatch(completingBatch.batch_id, { quantity_produced: qty });
      showSuccess(
        `Batch #${completingBatch.batch_id} completed! Deducted raw materials and added ${qty} units to finished product stock.`
      );
      setIsCompleteModalOpen(false);
      setCompletingBatch(null);
      loadData();
    } catch (err) {
      // Highlight database trigger rollback
      if (err.code === 'INSUFFICIENT_RAW_MATERIAL') {
        setCompleteError(
          `PostgreSQL Trigger Aborted Completion: ${err.message}. Stock deduction rolled back cleanly.`
        );
      } else {
        setCompleteError(err.message || 'Failed to complete batch');
      }
      showError(err.message || 'Batch completion failed');
    } finally {
      setCompleting(false);
    }
  };

  const columns = [
    {
      header: 'Batch ID',
      key: 'batch_id',
      className: 'w-24 font-mono text-xs text-slate-400 font-semibold',
      render: (val) => `#${val}`,
    },
    {
      header: 'Product',
      key: 'product_name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-100">{val || `Product #${row.product_id}`}</span>
          <div className="text-[11px] text-slate-500 font-mono">ID: {row.product_id}</div>
        </div>
      ),
    },
    {
      header: 'Start Date',
      key: 'start_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'End Date',
      key: 'end_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'Output Qty',
      key: 'quantity_produced',
      align: 'right',
      render: (val) => (
        <span className="font-mono font-semibold text-slate-200">
          {val ? `${val} units` : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      render: (val) => <Badge variant={val}>{val}</Badge>,
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, row) =>
        row.status === 'PLANNED' || row.status === 'IN_PROGRESS' ? (
          <Button
            id={`complete-batch-btn-${row.batch_id}`}
            size="sm"
            variant="success"
            icon={CheckCircle}
            onClick={() => handleOpenCompleteModal(row)}
          >
            Complete Batch
          </Button>
        ) : (
          <span className="text-xs text-slate-500 italic">No action needed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Production Batches</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manufacturing pipeline: converts Raw Materials into Finished Product stock via atomic DB trigger
          </p>
        </div>
        <Button
          id="plan-batch-btn"
          variant="primary"
          icon={Plus}
          onClick={() => {
            setIsCreateModalOpen(true);
            setCreateError(null);
            if (materials.length > 0 && materialsList.length === 0) {
              setMaterialsList([{ material_id: materials[0].material_id, quantity_used: 10 }]);
            }
          }}
        >
          Plan New Batch
        </Button>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      <Table
        id="batches-table"
        columns={columns}
        data={batches}
        isLoading={loading}
        emptyMessage="No production batches found"
        keyField="batch_id"
      />

      {/* Plan New Batch Modal */}
      <Modal
        id="plan-batch-modal"
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Plan Production Batch"
        subtitle="Schedules batch and defines raw material consumption targets"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button id="submit-plan-batch-btn" variant="primary" onClick={handleCreateBatch} isLoading={creating}>
              Create Batch
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          {createError && <AlertBanner variant="error" title="Error" message={createError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Product *
              </label>
              <select
                id="batch-product-select"
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select product to manufacture...</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.name} (Stock: {p.current_stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Planned Start Date
              </label>
              <input
                id="batch-start-date-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Planned Material Consumption */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Planned Material Usage (BOM)
              </label>
              <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={addMaterialRow}>
                Add Material
              </Button>
            </div>

            <div className="space-y-2">
              {materialsList.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800"
                >
                  <select
                    value={item.material_id}
                    onChange={(e) => updateMaterialRow(idx, 'material_id', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                  >
                    {materials.map((m) => (
                      <option key={m.material_id} value={m.material_id}>
                        {m.name} (Available: {m.current_stock} {m.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="Qty"
                    value={item.quantity_used}
                    onChange={(e) => updateMaterialRow(idx, 'quantity_used', e.target.value)}
                    className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeMaterialRow(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {materialsList.length === 0 && (
                <p className="text-xs text-slate-500 italic py-2">
                  No raw materials linked yet. Click "Add Material" above.
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Complete Batch Modal */}
      <Modal
        id="complete-batch-modal"
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title={`Complete Batch #${completingBatch?.batch_id}`}
        subtitle="Fires PostgreSQL trigger to deduct raw materials & credit finished goods"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCompleteModalOpen(false)} disabled={completing}>
              Cancel
            </Button>
            <Button
              id="confirm-complete-batch-btn"
              variant="success"
              onClick={handleCompleteBatch}
              isLoading={completing}
            >
              Execute Completion
            </Button>
          </>
        }
      >
        <form onSubmit={handleCompleteBatch} className="space-y-4">
          {completeError && (
            <AlertBanner variant="error" title="Batch Completion Failed" message={completeError} />
          )}

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-slate-100">
              Product: {completingBatch?.product_name || `Product #${completingBatch?.product_id}`}
            </div>
            <div>Database trigger: <code className="font-mono text-indigo-400">trg_production_batch_completion</code></div>
            <p className="text-[11px] text-slate-400 mt-1">
              Completing will lock raw materials, deduct planned consumption, record <code className="font-mono text-amber-300">PRODUCTION_CONSUMPTION</code> logs, increment product stock, and record <code className="font-mono text-emerald-300">PRODUCTION_OUTPUT</code> log.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Actual Units Produced *
            </label>
            <input
              id="batch-complete-qty-input"
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 100"
              value={completeQty}
              onChange={(e) => setCompleteQty(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-base font-semibold"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
