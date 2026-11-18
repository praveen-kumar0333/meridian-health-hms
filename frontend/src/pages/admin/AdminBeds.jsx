import { useState, useEffect, useCallback } from 'react';
import { BedDouble, CheckCircle2, ClipboardList, Plus, ShieldAlert } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { BedOccupancyChart } from '../../components/AnalyticsCharts.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { DEPARTMENT_OPTIONS, formatDateTime, getErrorMessage } from '../../utils/formatters.js';

export default function AdminBeds() {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [summary, setSummary] = useState({
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    reservedBeds: 0,
    occupancyRate: 0,
    hasDemoData: false,
  });
  const [loading, setLoading] = useState(true);

  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [invForm, setInvForm] = useState({
    id: '',
    department: 'Emergency Medicine',
    wardName: 'General Ward',
    totalBeds: 10,
    occupiedBeds: 0,
    reservedBeds: 0,
    notes: '',
    isDemoData: false,
  });
  const [invError, setInvError] = useState('');

  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [allocForm, setAllocForm] = useState({
    bedInventoryId: '',
    bedNumber: '',
    patientId: '',
    patientName: '',
    allocationType: 'Reserved',
    notes: '',
  });
  const [allocError, setAllocError] = useState('');

  const [confirmAllocAction, setConfirmAllocAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bedRes, patRes] = await Promise.all([
        api.get('/beds', { params: { department: deptFilter, status: statusFilter } }),
        api.get('/patients'),
      ]);
      setDepartments(bedRes.data?.departments || []);
      setAllDepartments(bedRes.data?.allDepartments || []);
      setAllocations(bedRes.data?.allocations || []);
      setSummary(
        bedRes.data?.summary || {
          totalBeds: 0,
          availableBeds: 0,
          occupiedBeds: 0,
          reservedBeds: 0,
          occupancyRate: 0,
          hasDemoData: false,
        }
      );
      setPatients(patRes.data?.patients || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load bed inventory.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, statusFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddInventory = () => {
    setInvError('');
    setInvForm({
      id: '',
      department: 'Emergency Medicine',
      wardName: 'General Ward',
      totalBeds: 10,
      occupiedBeds: 0,
      reservedBeds: 0,
      notes: '',
      isDemoData: false,
    });
    setInventoryModalOpen(true);
  };

  const openEditInventory = (inv) => {
    setInvError('');
    setInvForm({
      id: inv._id,
      department: inv.department,
      wardName: inv.wardName || 'General Ward',
      totalBeds: inv.totalBeds,
      occupiedBeds: inv.occupiedBeds,
      reservedBeds: inv.reservedBeds,
      notes: inv.notes || '',
      isDemoData: false,
    });
    setInventoryModalOpen(true);
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    setInvError('');

    const total = Number(invForm.totalBeds);
    const occupied = Number(invForm.occupiedBeds);
    const reserved = Number(invForm.reservedBeds);

    if (!Number.isInteger(total) || !Number.isInteger(occupied) || !Number.isInteger(reserved)) {
      setInvError('Bed counts must be whole integers.');
      return;
    }
    if (total < 0 || occupied < 0 || reserved < 0) {
      setInvError('Bed counts cannot be negative.');
      return;
    }
    if (occupied + reserved > total) {
      setInvError('Occupied and reserved beds cannot exceed total beds.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/beds', {
        id: invForm.id || undefined,
        department: invForm.department,
        wardName: invForm.wardName,
        totalBeds: total,
        occupiedBeds: occupied,
        reservedBeds: reserved,
        notes: invForm.notes,
        isDemoData: false,
      });
      showToast(`Bed inventory saved for ${invForm.department}.`);
      setInventoryModalOpen(false);
      loadData();
    } catch (err) {
      const msg = getErrorMessage(err);
      setInvError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedDemo = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/beds/seed-demo');
      showToast(res.data?.message || 'Demonstration bed counts loaded.');
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openAllocateModal = () => {
    setAllocError('');
    const firstAvail = allDepartments.find((d) => d.availableBeds > 0);
    setAllocForm({
      bedInventoryId: firstAvail?._id || '',
      bedNumber: '',
      patientId: '',
      patientName: '',
      allocationType: 'Reserved',
      notes: '',
    });
    setAllocateModalOpen(true);
  };

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    setAllocError('');
    setSubmitting(true);
    try {
      const res = await api.post('/beds/allocations', allocForm);
      showToast(res.data?.message || 'Bed allocation recorded.');
      setAllocateModalOpen(false);
      loadData();
    } catch (err) {
      const msg = getErrorMessage(err);
      setAllocError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmedAllocStatus = async () => {
    if (!confirmAllocAction) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/beds/allocations/${confirmAllocAction.allocation._id}/status`, {
        status: confirmAllocAction.nextStatus,
      });
      showToast(res.data?.message || 'Bed allocation updated.');
      setConfirmAllocAction(null);
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
      setConfirmAllocAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  const computedPreviewAvailable = Math.max(
    0,
    (Number(invForm.totalBeds) || 0) -
      (Number(invForm.occupiedBeds) || 0) -
      (Number(invForm.reservedBeds) || 0)
  );

  const inventoryColumns = [
    {
      key: 'department',
      header: 'Department & Ward',
      render: (row) => (
        <div>
          <div className="table-cell-primary">
            {row.department}{' '}
            {row.isDemoData && (
              <span className="table-cell-sub" style={{ fontWeight: 500 }}>
                (Demo Data)
              </span>
            )}
          </div>
          <div className="table-cell-sub">{row.wardName}</div>
        </div>
      ),
    },
    {
      key: 'totalBeds',
      header: 'Total',
      align: 'right',
      tabular: true,
      render: (row) => <strong>{row.totalBeds}</strong>,
    },
    {
      key: 'availableBeds',
      header: 'Available',
      align: 'right',
      tabular: true,
      render: (row) => (
        <span style={{ color: row.availableBeds > 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>
          {row.availableBeds}
        </span>
      ),
    },
    {
      key: 'occupiedBeds',
      header: 'Occupied',
      align: 'right',
      tabular: true,
      render: (row) => row.occupiedBeds,
    },
    {
      key: 'reservedBeds',
      header: 'Reserved',
      align: 'right',
      tabular: true,
      render: (row) => row.reservedBeds,
    },
    {
      key: 'status',
      header: 'Capacity Status',
      render: (row) => <StatusBadge status={row.availableBeds > 0 ? 'Available' : 'Full'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditInventory(row)}>
          Update Counts
        </button>
      ),
    },
  ];

  const allocationColumns = [
    {
      key: 'allocationCode',
      header: 'Allocation',
      render: (row) => (
        <div>
          <div className="table-cell-primary mono-text">{row.allocationCode}</div>
          <div className="table-cell-sub tabular-nums">{formatDateTime(row.allocatedAt)}</div>
        </div>
      ),
    },
    {
      key: 'bed',
      header: 'Department & Bed',
      render: (row) => (
        <div>
          <div className="table-cell-primary">Bed {row.bedNumber}</div>
          <div className="table-cell-sub">{row.department}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient / Emergency Ref',
      render: (row) => (
        <div>
          <div className="table-cell-primary">
            {row.patient?.user?.name || row.patientName || 'Unassigned'}
          </div>
          {row.emergencyRequest?.requestCode && (
            <div className="table-cell-sub mono-text">
              Emergency {row.emergencyRequest.requestCode}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions">
          {row.status === 'Reserved' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                setConfirmAllocAction({
                  allocation: row,
                  nextStatus: 'Occupied',
                  title: `Admit Patient to Bed ${row.bedNumber}`,
                  message: `Convert Bed ${row.bedNumber} (${row.department}) from Reserved to Occupied?`,
                })
              }
            >
              Mark Occupied
            </button>
          )}
          {(row.status === 'Reserved' || row.status === 'Occupied') && (
            <button
              type="button"
              className="btn btn-teal btn-sm"
              onClick={() =>
                setConfirmAllocAction({
                  allocation: row,
                  nextStatus: 'Released',
                  title: `Release Bed ${row.bedNumber}`,
                  message: `Release Bed ${row.bedNumber} back to ${row.department} availability?`,
                })
              }
            >
              Release Bed
            </button>
          )}
          {row.status === 'Released' && (
            <span className="table-cell-sub tabular-nums">
              Released {formatDateTime(row.releasedAt)}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bed Availability Management</h1>
          <p>Persistent MongoDB department bed capacities, emergency reservations, and occupancy analytics.</p>
        </div>
        <div className="page-header-actions">
          {allDepartments.length === 0 && !loading && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSeedDemo}
              disabled={submitting}
            >
              Load Demonstration Bed Setup
            </button>
          )}
          <button
            type="button"
            className="btn btn-teal"
            onClick={openAllocateModal}
            disabled={allDepartments.every((d) => d.availableBeds === 0)}
          >
            <BedDouble size={16} />
            Reserve / Occupy Bed
          </button>
          <button type="button" className="btn btn-primary" onClick={openAddInventory}>
            <Plus size={16} />
            Add / Update Department
          </button>
        </div>
      </div>

      {summary.hasDemoData && (
        <div className="alert-banner alert-banner--warning" role="note">
          <ShieldAlert size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Demonstration Bed Counts Present:</strong> Departments marked as{' '}
            <em>Demo Data</em> contain configurable baseline numbers. Update counts to reflect
            live hospital ward availability.
          </span>
        </div>
      )}

      <div className="stats-grid">
        <DashboardCard
          label="Total Beds"
          value={summary.totalBeds ?? 0}
          hint="Configured inpatient & ER beds"
          icon={BedDouble}
        />
        <DashboardCard
          label="Available Beds"
          value={summary.availableBeds ?? 0}
          hint="Open for immediate allocation"
          icon={CheckCircle2}
          tone="teal"
        />
        <DashboardCard
          label="Occupied Beds"
          value={summary.occupiedBeds ?? 0}
          hint={`${summary.occupancyRate ?? 0}% combined utilization`}
          icon={ClipboardList}
        />
        <DashboardCard
          label="Reserved Beds"
          value={summary.reservedBeds ?? 0}
          hint="Held for incoming & emergency patients"
          icon={ShieldAlert}
          tone="teal"
        />
      </div>

      <div className="analytics-grid-two">
        <section className="surface-card">
          <div className="surface-header">
            <h2>Available vs Occupied & Reserved Beds</h2>
          </div>
          <div className="surface-body">
            <BedOccupancyChart
              totalBeds={summary.totalBeds}
              availableBeds={summary.availableBeds}
              occupiedBeds={summary.occupiedBeds}
              reservedBeds={summary.reservedBeds}
            />
          </div>
        </section>

        <section className="surface-card">
          <div className="surface-header">
            <h2>Department-Wise Availability</h2>
          </div>
          <div className="surface-body">
            {allDepartments.length === 0 ? (
              <EmptyState
                title="No departments configured"
                message="Add department bed inventories or load demonstration counts to inspect availability."
              />
            ) : (
              <div className="dept-bar-list">
                {allDepartments.map((dept) => {
                  const pct =
                    dept.totalBeds > 0 ? Math.round((dept.availableBeds / dept.totalBeds) * 100) : 0;
                  return (
                    <div key={dept._id} className="dept-bar-row">
                      <div className="dept-bar-meta">
                        <span>{dept.department}</span>
                        <strong className="tabular-nums">
                          {dept.availableBeds} / {dept.totalBeds} available ({pct}%)
                        </strong>
                      </div>
                      <div className="dept-bar-track">
                        <div className="dept-bar-fill dept-bar-fill--approved" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="surface-card" style={{ marginBottom: '20px' }}>
        <div className="table-toolbar">
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Department Bed Inventory</h2>
          <div className="toolbar-filters">
            <select
              className="form-control form-control--inline"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              {allDepartments.map((d) => (
                <option key={d._id} value={d.department}>
                  {d.department}
                </option>
              ))}
            </select>
            <select
              className="form-control form-control--inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by bed status"
            >
              <option value="">All Statuses</option>
              <option value="available">Has Available Beds</option>
              <option value="full">At Capacity (Full)</option>
              <option value="reserved">Has Reserved Beds</option>
              <option value="occupied">Has Occupied Beds</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={inventoryColumns}
          data={departments}
          loading={loading}
          emptyTitle="No bed inventories configured"
          emptyMessage="Add a department bed inventory or adjust your active filters."
        />
      </section>

      <section className="surface-card">
        <div className="surface-header">
          <h2>Bed Allocation History</h2>
        </div>
        <DataTable
          columns={allocationColumns}
          data={allocations}
          loading={loading}
          emptyTitle="No bed allocations recorded"
          emptyMessage="Reserved, occupied, and released bed logs will appear here."
        />
      </section>

      {/* Add / Update Bed Inventory Modal */}
      <Modal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        title={invForm.id ? `Update Beds — ${invForm.department}` : 'Add Department Bed Capacity'}
      >
        <form onSubmit={handleSaveInventory}>
          {invError && (
            <div className="alert-banner alert-banner--error" role="alert">
              <span>{invError}</span>
            </div>
          )}

          <div className="form-grid">
            <FormInput
              label="Department"
              name="department"
              type="select"
              value={invForm.department}
              onChange={(e) => setInvForm({ ...invForm, department: e.target.value })}
              options={DEPARTMENT_OPTIONS}
              disabled={Boolean(invForm.id)}
              required
            />
            <FormInput
              label="Ward / Unit Name"
              name="wardName"
              value={invForm.wardName}
              onChange={(e) => setInvForm({ ...invForm, wardName: e.target.value })}
              placeholder="e.g. Cardiac Care Unit"
              required
            />
            <FormInput
              label="Total Beds"
              name="totalBeds"
              type="number"
              min="0"
              value={invForm.totalBeds}
              onChange={(e) => setInvForm({ ...invForm, totalBeds: e.target.value })}
              required
            />
            <FormInput
              label="Occupied Beds"
              name="occupiedBeds"
              type="number"
              min="0"
              value={invForm.occupiedBeds}
              onChange={(e) => setInvForm({ ...invForm, occupiedBeds: e.target.value })}
              required
            />
            <FormInput
              label="Reserved Beds"
              name="reservedBeds"
              type="number"
              min="0"
              value={invForm.reservedBeds}
              onChange={(e) => setInvForm({ ...invForm, reservedBeds: e.target.value })}
              required
            />
            <div className="form-field">
              <span className="form-label">Calculated Available Beds</span>
              <div className="form-control tabular-nums" style={{ backgroundColor: 'var(--bg-canvas)' }}>
                {computedPreviewAvailable}
              </div>
            </div>
            <FormInput
              label="Operational Notes"
              name="notes"
              value={invForm.notes}
              onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })}
              className="form-grid-full"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setInventoryModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Bed Inventory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Allocate Bed Modal */}
      <Modal
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        title="Reserve or Occupy Hospital Bed"
      >
        <form onSubmit={handleCreateAllocation}>
          {allocError && (
            <div className="alert-banner alert-banner--error" role="alert">
              <span>{allocError}</span>
            </div>
          )}

          <div className="form-grid">
            <FormInput
              label="Department"
              name="bedInventoryId"
              type="select"
              value={allocForm.bedInventoryId}
              onChange={(e) => setAllocForm({ ...allocForm, bedInventoryId: e.target.value })}
              options={[
                { value: '', label: 'Select department with open beds...' },
                ...allDepartments
                  .filter((d) => d.availableBeds > 0)
                  .map((d) => ({
                    value: d._id,
                    label: `${d.department} (${d.availableBeds} available)`,
                  })),
              ]}
              required
            />
            <FormInput
              label="Bed Number"
              name="bedNumber"
              value={allocForm.bedNumber}
              onChange={(e) => setAllocForm({ ...allocForm, bedNumber: e.target.value })}
              placeholder="e.g. WARD-204"
              required
            />
            <FormInput
              label="Allocation Type"
              name="allocationType"
              type="select"
              value={allocForm.allocationType}
              onChange={(e) => setAllocForm({ ...allocForm, allocationType: e.target.value })}
              options={['Reserved', 'Occupied']}
              required
            />
            <FormInput
              label="Registered Patient (Optional)"
              name="patientId"
              type="select"
              value={allocForm.patientId}
              onChange={(e) => setAllocForm({ ...allocForm, patientId: e.target.value })}
              options={[
                { value: '', label: 'Select patient or enter name...' },
                ...patients.map((p) => ({
                  value: p._id,
                  label: `${p.user?.name} (${p.patientCode || p.user?.email})`,
                })),
              ]}
            />
            <FormInput
              label="Patient Name Reference (If walk-in)"
              name="patientName"
              value={allocForm.patientName}
              onChange={(e) => setAllocForm({ ...allocForm, patientName: e.target.value })}
              placeholder="Optional patient name"
            />
            <FormInput
              label="Notes"
              name="notes"
              value={allocForm.notes}
              onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })}
              placeholder="Reason or ward note"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAllocateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Allocating...' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(confirmAllocAction)}
        onClose={() => setConfirmAllocAction(null)}
        onConfirm={handleConfirmedAllocStatus}
        loading={submitting}
        title={confirmAllocAction?.title || 'Update Bed Allocation'}
        confirmLabel="Confirm"
        message={confirmAllocAction?.message || ''}
      />
    </div>
  );
}
