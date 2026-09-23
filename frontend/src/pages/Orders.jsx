import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AlertBanner } from '../components/common/AlertBanner';
import { useToast } from '../context/ToastContext';
import { formatDate, formatCurrency, parseNum } from '../utils/formatters';
import { ShoppingCart, Plus, Eye, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Orders({ refreshKey }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  // View Order Details Modal State
  const [viewOrderModalOpen, setViewOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  // Place Order Modal State
  const [placeOrderModalOpen, setPlaceOrderModalOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, custData, prodData] = await Promise.all([
        api.getOrders(),
        api.getCustomers().catch(() => []),
        api.getProducts().catch(() => []),
      ]);
      setOrders(orderData || []);
      setCustomers(custData || []);
      setProducts(prodData || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Open Order Details
  const handleViewOrder = async (order) => {
    setViewOrderModalOpen(true);
    setLoadingOrderDetails(true);
    setSelectedOrder(null);
    try {
      const data = await api.getOrder(order.order_id);
      setSelectedOrder(data);
    } catch (err) {
      showError(err.message || 'Failed to load order line items');
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Item row management in Create Order
  const addOrderItemRow = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setOrderItems((prev) => [
      ...prev,
      {
        product_id: defaultProd.product_id,
        quantity: 1,
        unit_price: parseNum(defaultProd.unit_price),
      },
    ]);
  };

  const removeOrderItemRow = (index) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOrderItemRow = (index, field, value) => {
    setOrderItems((prev) => {
      const next = [...prev];
      if (field === 'product_id') {
        const prod = products.find((p) => String(p.product_id) === String(value));
        next[index] = {
          ...next[index],
          product_id: parseInt(value, 10),
          unit_price: prod ? parseNum(prod.unit_price) : next[index].unit_price,
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleOpenPlaceOrder = () => {
    setPlaceOrderModalOpen(true);
    setOrderError(null);
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].customer_id);
    }
    if (products.length > 0 && orderItems.length === 0) {
      setOrderItems([
        {
          product_id: products[0].product_id,
          quantity: 1,
          unit_price: parseNum(products[0].unit_price),
        },
      ]);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderError(null);

    if (!selectedCustomerId) {
      setOrderError('Please select a customer for this order');
      return;
    }

    if (orderItems.length === 0) {
      setOrderError('Order must contain at least one product item');
      return;
    }

    for (let i = 0; i < orderItems.length; i++) {
      const itm = orderItems[i];
      if (!itm.quantity || parseFloat(itm.quantity) <= 0) {
        setOrderError(`Item #${i + 1} has an invalid quantity`);
        return;
      }
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        customer_id: parseInt(selectedCustomerId, 10),
        items: orderItems.map((itm) => ({
          product_id: parseInt(itm.product_id, 10),
          quantity: parseFloat(itm.quantity),
          unit_price: parseFloat(itm.unit_price),
        })),
      };

      const res = await api.createOrder(payload);
      showSuccess(
        `Order #${res.order_id} placed successfully! Stock deducted atomically via database trigger.`
      );
      setPlaceOrderModalOpen(false);
      setOrderItems([]);
      loadData();
    } catch (err) {
      // Highlight PostgreSQL Concurrency / Insufficient stock rollback
      if (err.code === 'INSUFFICIENT_STOCK') {
        setOrderError(
          `409 INSUFFICIENT_STOCK: Database Trigger trg_order_item_after_insert aborted insertion. ${err.message}. Entire transaction rolled back.`
        );
      } else {
        setOrderError(err.message || 'Order creation failed');
      }
      showError(err.message || 'Order failed');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const calculateTotalOrderAmount = () => {
    return orderItems.reduce(
      (sum, itm) => sum + (parseFloat(itm.quantity) || 0) * (parseFloat(itm.unit_price) || 0),
      0
    );
  };

  const columns = [
    {
      header: 'Order ID',
      key: 'order_id',
      className: 'w-24 font-mono text-xs text-slate-400 font-semibold',
      render: (val) => `#${val}`,
    },
    {
      header: 'Customer',
      key: 'customer_name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-100">{val || `Customer #${row.customer_id}`}</span>
          <div className="text-[11px] text-slate-500 font-mono">ID: {row.customer_id}</div>
        </div>
      ),
    },
    {
      header: 'Order Date',
      key: 'order_date',
      render: (val) => formatDate(val),
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
      render: (_, row) => (
        <Button
          id={`view-order-btn-${row.order_id}`}
          size="sm"
          variant="outline"
          icon={Eye}
          onClick={() => handleViewOrder(row)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Customer Orders</h2>
          <p className="text-xs text-slate-400 mt-1">
            Orders wrapped in ACID transactions: line item triggers lock finished stock via <code className="font-mono text-indigo-400">SELECT ... FOR UPDATE</code>
          </p>
        </div>
        <Button
          id="place-order-btn"
          variant="primary"
          icon={Plus}
          onClick={handleOpenPlaceOrder}
        >
          Place New Order
        </Button>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      <Table
        id="orders-table"
        columns={columns}
        data={orders}
        isLoading={loading}
        emptyMessage="No customer orders recorded"
        keyField="order_id"
      />

      {/* Place Order Modal */}
      <Modal
        id="place-order-modal"
        isOpen={placeOrderModalOpen}
        onClose={() => setPlaceOrderModalOpen(false)}
        title="Place New Customer Order"
        subtitle="Executes atomic order insertion wrapped in a single PostgreSQL transaction"
        maxWidth="max-w-2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-400">
              Total Order Value:{' '}
              <strong className="text-sm font-mono text-emerald-400">
                {formatCurrency(calculateTotalOrderAmount())}
              </strong>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPlaceOrderModalOpen(false)}
                disabled={submittingOrder}
              >
                Cancel
              </Button>
              <Button
                id="submit-order-btn"
                variant="primary"
                onClick={handlePlaceOrder}
                isLoading={submittingOrder}
              >
                Place Order
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handlePlaceOrder} className="space-y-4">
          {orderError && (
            <AlertBanner
              variant="error"
              title="Database Transaction Aborted"
              message={orderError}
            />
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Customer *
            </label>
            <select
              id="order-customer-select"
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Customer...</option>
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name} ({c.contact_info || 'No contact'})
                </option>
              ))}
            </select>
          </div>

          {/* Line Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Order Line Items
              </label>
              <Button
                id="add-order-item-btn"
                type="button"
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={addOrderItemRow}
              >
                Add Product
              </Button>
            </div>

            <div className="space-y-2">
              {orderItems.map((item, idx) => {
                const prod = products.find((p) => String(p.product_id) === String(item.product_id));
                const availableStock = prod ? parseNum(prod.current_stock) : 0;
                const requestedQty = parseFloat(item.quantity) || 0;
                const exceeds = requestedQty > availableStock;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-colors ${
                      exceeds
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateOrderItemRow(idx, 'product_id', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                        >
                          {products.map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} (Stock: {p.current_stock} units)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateOrderItemRow(idx, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono"
                        />
                      </div>

                      <div className="w-28 text-right font-mono text-xs text-emerald-400 font-semibold px-2">
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOrderItemRow(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {exceeds && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          Warning: Requested quantity ({requestedQty}) exceeds available stock ({availableStock}). The backend will reject this with a 409 conflict and rollback.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* View Order Details Modal */}
      <Modal
        id="view-order-modal"
        isOpen={viewOrderModalOpen}
        onClose={() => setViewOrderModalOpen(false)}
        title={`Order #${selectedOrder?.order_id || '...'}`}
        subtitle={`Placed on ${formatDate(selectedOrder?.order_date)}`}
        maxWidth="max-w-xl"
        footer={
          <Button variant="secondary" onClick={() => setViewOrderModalOpen(false)}>
            Close
          </Button>
        }
      >
        {loadingOrderDetails ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading order items...</div>
        ) : selectedOrder ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs text-slate-400">Status</div>
                <div className="mt-1">
                  <Badge variant={selectedOrder.status}>{selectedOrder.status}</Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Customer ID</div>
                <div className="text-sm font-semibold text-slate-200 font-mono">
                  #{selectedOrder.customer_id}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Purchased Line Items
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/40 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">
                        {item.product_name || `Product #${item.product_id}`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {item.quantity} units @ {formatCurrency(item.unit_price)} each
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-slate-100">
                      {formatCurrency(parseNum(item.quantity) * parseNum(item.unit_price))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">Order details unavailable.</div>
        )}
      </Modal>
    </div>
  );
}
