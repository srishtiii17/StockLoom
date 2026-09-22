import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AlertBanner } from '../components/common/AlertBanner';
import { useToast } from '../context/ToastContext';
import { parseNum, formatCurrency, formatQty } from '../utils/formatters';
import { Package, Plus } from 'lucide-react';

export function Products({ refreshKey }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  // New Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    unit_price: '',
    category: '',
    current_stock: '0',
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      setProducts(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Product name is required');
      return;
    }

    const price = parseFloat(formData.unit_price);
    if (Number.isNaN(price) || price < 0) {
      setFormError('Unit price must be a valid positive number');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        unit_price: price,
        category: formData.category.trim() || undefined,
        current_stock: formData.current_stock ? parseFloat(formData.current_stock) : 0,
      };

      await api.createProduct(payload);
      showSuccess(`Product "${formData.name}" created successfully`);
      setIsModalOpen(false);
      setFormData({ name: '', unit_price: '', category: '', current_stock: '0' });
      loadProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to create product');
      showError(err.message || 'Product creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      key: 'product_id',
      className: 'w-16 font-mono text-xs text-slate-500',
    },
    {
      header: 'Product Name',
      key: 'name',
      render: (val) => <span className="font-semibold text-slate-100">{val}</span>,
    },
    {
      header: 'Category',
      key: 'category',
      render: (val) =>
        val ? (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-xs text-slate-300 font-medium">
            {val}
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">None</span>
        ),
    },
    {
      header: 'Unit Price',
      key: 'unit_price',
      align: 'right',
      render: (val) => (
        <span className="font-mono text-sm font-semibold text-emerald-400">
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      header: 'Finished Stock',
      key: 'current_stock',
      align: 'right',
      render: (val) => (
        <span className="font-mono font-semibold text-slate-200">
          {formatQty(val, 'units')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Products Catalog</h2>
          <p className="text-xs text-slate-400 mt-1">
            Finished goods manufactured and available for customer orders
          </p>
        </div>
        <Button
          id="add-product-btn"
          variant="primary"
          icon={Plus}
          onClick={() => setIsModalOpen(true)}
        >
          Add Product
        </Button>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      <Table
        id="products-table"
        columns={columns}
        data={products}
        isLoading={loading}
        emptyMessage="No products configured yet"
        keyField="product_id"
      />

      {/* New Product Modal */}
      <Modal
        id="add-product-modal"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Finished Product"
        subtitle="Registers a new product into PostgreSQL catalog"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              id="submit-product-btn"
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitting}
            >
              Save Product
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <AlertBanner variant="error" title="Validation Failed" message={formError} />
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Product Name *
            </label>
            <input
              id="product-name-input"
              type="text"
              required
              placeholder="e.g. Cotton T-Shirt White"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Unit Price ($) *
              </label>
              <input
                id="product-price-input"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="29.99"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <input
                id="product-category-input"
                type="text"
                placeholder="e.g. Apparel"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Initial Stock Quantity
            </label>
            <input
              id="product-stock-input"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              value={formData.current_stock}
              onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Note: Ongoing stock increments should occur via Production Batch completion.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
