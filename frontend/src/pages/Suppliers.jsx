import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { AlertBanner } from '../components/common/AlertBanner';
import { Truck, Clock, Mail } from 'lucide-react';

export function Suppliers({ refreshKey }) {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState(null);

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [refreshKey]);

  const columns = [
    {
      header: 'Supplier ID',
      key: 'supplier_id',
      className: 'w-24 font-mono text-xs text-slate-400 font-semibold',
      render: (val) => `#${val}`,
    },
    {
      header: 'Supplier Name',
      key: 'name',
      render: (val) => <span className="font-semibold text-slate-100">{val}</span>,
    },
    {
      header: 'Contact Info',
      key: 'contact_info',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-slate-300">
          <Mail className="w-3.5 h-3.5 text-slate-500" />
          <span>{val || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Lead Time',
      key: 'lead_time_days',
      align: 'right',
      render: (val) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-400">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{val} days</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Suppliers Directory</h2>
        <p className="text-xs text-slate-400 mt-1">
          Raw material vendor partnerships and procurement lead times
        </p>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      <Table
        id="suppliers-table"
        columns={columns}
        data={suppliers}
        isLoading={loading}
        emptyMessage="No suppliers registered"
        keyField="supplier_id"
      />
    </div>
  );
}
