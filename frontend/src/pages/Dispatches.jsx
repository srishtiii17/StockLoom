import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AlertBanner } from '../components/common/AlertBanner';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import { Send, Plus, Truck, Hash } from 'lucide-react';

export function Dispatches({ refreshKey }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  // New Dispatch Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    order_id: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    carrier: 'Express Logistics',
    tracking_ref: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dispatchData, orderData] = await Promise.all([
        api.getDispatches(),
        api.getOrders().catch(() => []),
      ]);
      setDispatches(dispatchData || []);
      setOrders(orderData || []);
    } catch (err) {
      setError(err.message || 'Failed to load dispatches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Orders that are currently PENDING (available to dispatch)
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.order_id) {
      setFormError('Order ID is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_id: parseInt(formData.order_id, 10),
        dispatch_date: formData.dispatch_date ? new Date(formData.dispatch_date).toISOString() : undefined,
        carrier: formData.carrier.trim() || undefined,
        tracking_ref: formData.tracking_ref.trim() || undefined,
      };

      await api.createDispatch(payload);
      showSuccess(`Dispatch recorded for Order #${formData.order_id}. Order marked as DISPATCHED.`);
      setIsModalOpen(false);
      setFormData({
        order_id: '',
        dispatch_date: new Date().toISOString().split('T')[0],
        carrier: 'Express Logistics',
        tracking_ref: '',
      });
      loadData();
    } catch (err) {
      if (err.code === 'UNIQUE_VIOLATION') {
        setFormError(`409 UNIQUE_VIOLATION: Order #${formData.order_id} already has a recorded dispatch.`);
      } else {
        setFormError(err.message || 'Failed to record dispatch');
      }
      showError(err.message || 'Dispatch failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Dispatch ID',
      key: 'dispatch_id',
      className: 'w-24 font-mono text-xs text-slate-400 font-semibold',
      render: (val) => `#${val}`,
    },
    {
      header: 'Order Reference',
      key: 'order_id',
      render: (val) => (
        <span className="font-mono font-semibold text-indigo-400">
          Order #{val}
        </span>
      ),
    },
    {
      header: 'Dispatch Date',
      key: 'dispatch_date',
      render: (val) => formatDate(val),
    },
    {
      header: 'Carrier',
      key: 'carrier',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-slate-200">
          <Truck className="w-3.5 h-3.5 text-slate-400" />
          <span>{val || 'Standard Freight'}</span>
        </div>
      ),
    },
    {
      header: 'Tracking Ref',
      key: 'tracking_ref',
      render: (val) => (
        <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          {val || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Order Dispatches</h2>
          <p className="text-xs text-slate-400 mt-1">
            Shipping logistics & 1:1 dispatch fulfillment linking orders to carriers
          </p>
        </div>
        <Button
          id="create-dispatch-btn"
          variant="primary"
          icon={Plus}
          onClick={() => {
            setIsModalOpen(true);
            setFormError(null);
            if (pendingOrders.length > 0) {
              setFormData((prev) => ({ ...prev, order_id: pendingOrders[0].order_id }));
            }
          }}
        >
          Record Dispatch
        </Button>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      <Table
        id="dispatches-table"
        columns={columns}
        data={dispatches}
        isLoading={loading}
        emptyMessage="No dispatches recorded yet"
        keyField="dispatch_id"
      />

      {/* Record Dispatch Modal */}
      <Modal
        id="create-dispatch-modal"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Order Dispatch"
        subtitle="Associates carrier & tracking with an order, advancing order status to DISPATCHED"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              id="submit-dispatch-btn"
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitting}
            >
              Confirm Dispatch
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <AlertBanner variant="error" title="Dispatch Failed" message={formError} />
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Order to Dispatch *
            </label>
            <select
              id="dispatch-order-select"
              required
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">Select an order...</option>
              {pendingOrders.map((o) => (
                <option key={o.order_id} value={o.order_id}>
                  Order #{o.order_id} ({o.customer_name || `Customer #${o.customer_id}`}) - Placed {formatDate(o.order_date)}
                </option>
              ))}
              {pendingOrders.length === 0 && (
                <option disabled value="">No pending orders available for dispatch</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Dispatch Date
              </label>
              <input
                id="dispatch-date-input"
                type="date"
                value={formData.dispatch_date}
                onChange={(e) => setFormData({ ...formData, dispatch_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Carrier
              </label>
              <input
                id="dispatch-carrier-input"
                type="text"
                placeholder="e.g. DHL Express, Blue Dart"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Tracking Reference Code
            </label>
            <input
              id="dispatch-tracking-input"
              type="text"
              placeholder="e.g. TRK-882941-X"
              value={formData.tracking_ref}
              onChange={(e) => setFormData({ ...formData, tracking_ref: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
