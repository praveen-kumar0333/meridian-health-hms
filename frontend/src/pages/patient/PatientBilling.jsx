import { useState, useEffect, useCallback } from 'react';
import { CreditCard, DollarSign, Eye } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters.js';

export default function PatientBilling() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ totalPaid: 0, totalPending: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing', { params: { status: statusFilter } });
      setInvoices(res.data?.invoices || []);
      setSummary(res.data?.summary || { totalPaid: 0, totalPending: 0 });
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load invoices.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice Number',
      render: (row) => <span className="mono-text table-cell-primary">{row.invoiceNumber}</span>,
    },
    {
      key: 'date',
      header: 'Issued Date',
      tabular: true,
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'total',
      header: 'Total Amount',
      align: 'right',
      tabular: true,
      render: (row) => <strong>{formatCurrency(row.totalAmount)}</strong>,
    },
    {
      key: 'method',
      header: 'Payment Method',
      render: (row) => row.paymentMethod || 'Unpaid',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      key: 'actions',
      header: 'Details',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedInvoice(row)}
        >
          <Eye size={14} />
          View
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Billing & Statements</h1>
          <p>View itemized hospital invoices and track your payment status.</p>
        </div>
      </div>

      <div className="stats-grid stats-grid--three">
        <DashboardCard
          label="Total Invoices"
          value={invoices.length}
          hint="Statements on file"
          icon={CreditCard}
        />
        <DashboardCard
          label="Total Paid"
          value={formatCurrency(summary.totalPaid)}
          hint="Settled statements"
          icon={DollarSign}
          tone="teal"
        />
        <DashboardCard
          label="Balance Due"
          value={formatCurrency(summary.totalPending)}
          hint="Pending or overdue"
          icon={CreditCard}
        />
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <div className="segmented-tabs">
            {['', 'Pending', 'Paid', 'Overdue'].map((st) => (
              <button
                key={st || 'all'}
                type="button"
                className={`segmented-tab ${statusFilter === st ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st || 'All'}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={invoices}
          loading={loading}
          emptyTitle="No invoices found"
          emptyMessage="Hospital invoices issued to your account will appear here."
        />
      </div>

      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
      >
        {selectedInvoice && (
          <div className="dashboard-stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Issued Date</span>
                <span className="detail-value tabular-nums">{formatDate(selectedInvoice.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Payment Status</span>
                <div>
                  <StatusBadge status={selectedInvoice.paymentStatus} />
                </div>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.description}</td>
                    <td className="text-right tabular-nums">{item.quantity}</td>
                    <td className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right tabular-nums">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              <span className="tabular-nums">Subtotal: {formatCurrency(selectedInvoice.subtotal)}</span>
              <span className="tabular-nums">Tax: {formatCurrency(selectedInvoice.taxAmount)}</span>
              <span className="tabular-nums">Discount: -{formatCurrency(selectedInvoice.discountAmount)}</span>
              <strong className="tabular-nums" style={{ fontSize: '16px', marginTop: '4px' }}>
                Total Due: {formatCurrency(selectedInvoice.totalAmount)}
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
