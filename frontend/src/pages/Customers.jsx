import React, { useState, useEffect } from 'react';
import { api } from '../api/services';
import { Table } from '../components/common/Table';
import { AlertBanner } from '../components/common/AlertBanner';
import { Users, Mail, MapPin } from 'lucide-react';

export function Customers({ refreshKey }) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [refreshKey]);

  const columns = [
    {
      header: 'Customer ID',
      key: 'customer_id',
      className: 'w-24 font-mono text-xs text-slate-400 font-semibold',
      render: (val) => `#${val}`,
    },
    {
      header: 'Customer Name',
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
      header: 'Shipping Address',
      key: 'address',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span>{val || '—'}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Customers Directory</h2>
        <p className="text-xs text-slate-400 mt-1">
          Registered commercial and retail client accounts
        </p>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} />}

      <Table
        id="customers-table"
        columns={columns}
        data={customers}
        isLoading={loading}
        emptyMessage="No customers registered"
        keyField="customer_id"
      />
    </div>
  );
}
