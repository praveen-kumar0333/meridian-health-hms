import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CreditCard, DollarSign, Eye, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { formatCurrency, formatDate, getErrorMessage } from '../../utils/formatters.js';

export default function AdminBilling() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ totalPaid: 0, totalPending: 0 });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    taxAmount: 0,
    discountAmount: 0,
    paymentStatus: 'Pending',
    paymentMethod: 'Unpaid',
    notes: '',
    items: [{ description: 'Specialist Consultation', quantity: 1, unitPrice: 120 }],
  });
  const [submitting, setSubmitting] = useState(false);

  const [viewInvoice, setViewInvoice] = useState(null);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [updateForm, setUpdateForm] = useState({ paymentStatus: 'Paid', paymentMethod: 'Card' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billRes, patRes] = await Promise.all([
        api.get('/billing', { params: { search, status: statusFilter } }),
        api.get('/patients'),
      ]);
      setInvoices(billRes.data?.invoices || []);
      setSummary(billRes.data?.summary || { totalPaid: 0, totalPending: 0 });
      setPatients(patRes.data?.patients || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load billing records.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const subtotal = form.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const computedTotal = Math.max(
    0,
    subtotal + (Number(form.taxAmount) || 0) - (Number(form.discountAmount) || 0)
  );

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/billing', form);
      showToast('Invoice generated successfully.');
      setCreateOpen(false);
      setForm({
        patientId: '',
        taxAmount: 0,
        discountAmount: 0,
        paymentStatus: 'Pending',
        paymentMethod: 'Unpaid',
        notes: '',
        items: [{ description: 'Specialist Consultation', quantity: 1, unitPrice: 120 }],
      });
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!updateTarget) return;
    setSubmitting(true);
    try {
      await api.patch(`/billing/${updateTarget._id}/status`, updateForm);
      showToast('Payment status updated.');
      setUpdateTarget(null);
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.delete(`/billing/${deleteTarget._id}`);
      showToast('Invoice deleted.');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (row) => (
        <div>
          <div className="table-cell-primary mono-text">{row.invoiceNumber}</div>
          <div className="table-cell-sub tabular-nums">{formatDate(row.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.patient?.user?.name || 'Unknown'}</div>
          <div className="table-cell-sub">{row.patient?.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      align: 'right',
      tabular: true,
      render: (row) => <strong>{formatCurrency(row.totalAmount)}</strong>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => row.paymentMethod || 'Unpaid',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setViewInvoice(row)}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setUpdateTarget(row);
              setUpdateForm({
                paymentStatus: row.paymentStatus === 'Paid' ? 'Paid' : 'Paid',
                paymentMethod: row.paymentMethod === 'Unpaid' ? 'Card' : row.paymentMethod,
              });
            }}
          >
            Update Status
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Billing & Invoices</h1>
          <p>Create itemized hospital invoices and track collected or pending payments.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/admin/revenue" className="btn btn-secondary">
            <BarChart3 size={16} />
            Revenue Analytics
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Create Invoice
          </button>
        </div>
      </div>

      <div className="stats-grid stats-grid--three">
        <DashboardCard
          label="Total Invoices"
          value={invoices.length}
          hint="Matching current filter"
          icon={CreditCard}
        />
        <DashboardCard
          label="Collected (Paid)"
          value={formatCurrency(summary.totalPaid)}
          hint="Confirmed settled bills"
          icon={DollarSign}
          tone="teal"
        />
        <DashboardCard
          label="Outstanding (Pending / Overdue)"
          value={formatCurrency(summary.totalPending)}
          hint="Awaiting patient settlement"
          icon={CreditCard}
        />
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoice # or patient name..."
          />
          <div className="toolbar-filters">
            <select
              className="form-control form-control--inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={invoices}
          loading={loading}
          emptyTitle="No invoices yet"
          emptyMessage="Create an invoice to begin tracking patient billing."
        />
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Generate Hospital Invoice"
        size="lg"
      >
        <form onSubmit={handleCreateInvoice}>
          <div className="form-grid">
            <FormInput
              label="Patient"
              name="patientId"
              type="select"
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              options={[
                { value: '', label: 'Select patient...' },
                ...patients.map((p) => ({
                  value: p._id,
                  label: `${p.user?.name} (${p.patientCode || p.user?.email})`,
                })),
              ]}
              required
              className="form-grid-full"
            />
          </div>

          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="form-label">Line Items</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
                  }))
                }
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="invoice-item-row">
                <FormInput
                  label={idx === 0 ? 'Service Description' : ''}
                  name={`desc-${idx}`}
                  value={item.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  placeholder="Consultation / Lab Test"
                  required
                />
                <FormInput
                  label={idx === 0 ? 'Qty' : ''}
                  name={`qty-${idx}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  required
                />
                <FormInput
                  label={idx === 0 ? 'Unit Price ($)' : ''}
                  name={`price-${idx}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={form.items.length === 1}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      items: prev.items.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="form-grid" style={{ marginTop: '14px' }}>
            <FormInput
              label="Tax ($)"
              name="taxAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.taxAmount}
              onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
            />
            <FormInput
              label="Discount ($)"
              name="discountAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.discountAmount}
              onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
            />
            <FormInput
              label="Payment Status"
              name="paymentStatus"
              type="select"
              value={form.paymentStatus}
              onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              options={['Pending', 'Paid', 'Overdue']}
            />
            <FormInput
              label="Payment Method"
              name="paymentMethod"
              type="select"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              options={['Unpaid', 'Card', 'Cash', 'Bank Transfer', 'Insurance']}
            />
            <FormInput
              label="Billing Notes"
              name="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="form-grid-full"
            />
          </div>

          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              background: 'var(--bg-canvas)',
              borderRadius: '6px',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
            }}
          >
            <span>Total Invoice Amount</span>
            <span className="tabular-nums">{formatCurrency(computedTotal)}</span>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Generating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        isOpen={Boolean(viewInvoice)}
        onClose={() => setViewInvoice(null)}
        title={`Invoice ${viewInvoice?.invoiceNumber || ''}`}
      >
        {viewInvoice && (
          <div className="dashboard-stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Patient</span>
                <span className="detail-value">{viewInvoice.patient?.user?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <div>
                  <StatusBadge status={viewInvoice.paymentStatus} />
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Payment Method</span>
                <span className="detail-value">{viewInvoice.paymentMethod}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Created Date</span>
                <span className="detail-value tabular-nums">{formatDate(viewInvoice.createdAt)}</span>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(viewInvoice.items || []).map((item, idx) => (
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
              <span className="tabular-nums">Subtotal: {formatCurrency(viewInvoice.subtotal)}</span>
              <span className="tabular-nums">Tax: {formatCurrency(viewInvoice.taxAmount)}</span>
              <span className="tabular-nums">Discount: -{formatCurrency(viewInvoice.discountAmount)}</span>
              <strong className="tabular-nums" style={{ fontSize: '16px', marginTop: '4px' }}>
                Total: {formatCurrency(viewInvoice.totalAmount)}
              </strong>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Payment Modal */}
      <Modal
        isOpen={Boolean(updateTarget)}
        onClose={() => setUpdateTarget(null)}
        title={`Update Payment — ${updateTarget?.invoiceNumber || ''}`}
        size="sm"
      >
        <form onSubmit={handleUpdatePayment}>
          <FormInput
            label="Payment Status"
            name="paymentStatus"
            type="select"
            value={updateForm.paymentStatus}
            onChange={(e) => setUpdateForm({ ...updateForm, paymentStatus: e.target.value })}
            options={['Pending', 'Paid', 'Overdue', 'Cancelled']}
          />
          <FormInput
            label="Payment Method"
            name="paymentMethod"
            type="select"
            value={updateForm.paymentMethod}
            onChange={(e) => setUpdateForm({ ...updateForm, paymentMethod: e.target.value })}
            options={['Card', 'Cash', 'Bank Transfer', 'Insurance', 'Unpaid']}
          />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setUpdateTarget(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteInvoice}
        loading={submitting}
        title="Delete Invoice"
        confirmLabel="Delete"
        message={`Delete invoice ${deleteTarget?.invoiceNumber}? This action cannot be undone.`}
      />
    </div>
  );
}
