import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { formatDateTime, getErrorMessage } from '../../utils/formatters.js';

const EMERGENCY_STATUSES = [
  'New',
  'Acknowledged',
  'Ambulance Arranged',
  'Bed Reserved',
  'Completed',
  'Cancelled',
];

export default function AdminEmergency() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    newCount: 0,
    acknowledgedCount: 0,
    ambulanceArrangedCount: 0,
    bedReservedCount: 0,
    completedCount: 0,
  });
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  const [activeRequest, setActiveRequest] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    status: 'Acknowledged',
    adminNote: '',
    arranged: false,
    providerOrUnit: '',
    driverOrContactPhone: '',
    dispatchNotes: '',
  });
  const [bedForm, setBedForm] = useState({
    bedInventoryId: '',
    bedNumber: '',
    notes: '',
  });
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emgRes, bedRes] = await Promise.all([
        api.get('/emergency', {
          params: { search, status: statusFilter, urgency: urgencyFilter },
        }),
        api.get('/beds'),
      ]);
      const list = emgRes.data?.requests || [];
      setRequests(list);
      setSummary(
        emgRes.data?.summary || {
          total: 0,
          newCount: 0,
          acknowledgedCount: 0,
          ambulanceArrangedCount: 0,
          bedReservedCount: 0,
          completedCount: 0,
        }
      );
      setInventories(bedRes.data?.allDepartments || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load emergency requests.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, urgencyFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openManageModal = (reqItem) => {
    setActiveRequest(reqItem);
    setUpdateForm({
      status: reqItem.status,
      adminNote: '',
      arranged: Boolean(reqItem.ambulanceArrangement?.arranged),
      providerOrUnit: reqItem.ambulanceArrangement?.providerOrUnit || '',
      driverOrContactPhone: reqItem.ambulanceArrangement?.driverOrContactPhone || '',
      dispatchNotes: reqItem.ambulanceArrangement?.dispatchNotes || '',
    });
    const firstAvailableDept = inventories.find((inv) => inv.availableBeds > 0);
    setBedForm({
      bedInventoryId: firstAvailableDept?._id || '',
      bedNumber: '',
      notes: '',
    });
  };

  const submitStatusUpdate = async () => {
    if (!activeRequest) return;
    setSubmitting(true);
    try {
      const payload = {
        status: updateForm.status,
        adminNote: updateForm.adminNote.trim(),
      };
      if (updateForm.arranged) {
        payload.ambulanceArrangement = {
          arranged: true,
          providerOrUnit: updateForm.providerOrUnit.trim(),
          driverOrContactPhone: updateForm.driverOrContactPhone.trim(),
          dispatchNotes: updateForm.dispatchNotes.trim(),
        };
      }
      const res = await api.patch(`/emergency/${activeRequest._id}`, payload);
      showToast('Emergency request updated and patient notified.');
      setPendingConfirm(null);
      setActiveRequest(res.data?.request || null);
      setUpdateForm((prev) => ({ ...prev, adminNote: '' }));
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
      setPendingConfirm(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (!activeRequest) return;
    setPendingConfirm({
      type: 'status',
      title: `Confirm Update — ${activeRequest.requestCode}`,
      message: `Apply status "${updateForm.status}"${
        updateForm.arranged ? ' with recorded ambulance arrangement' : ''
      } and notify ${activeRequest.patient?.user?.name || 'the patient'}?`,
    });
  };

  const handleQuickAcknowledge = (reqItem) => {
    setActiveRequest(reqItem);
    setPendingConfirm({
      type: 'acknowledge',
      requestItem: reqItem,
      title: `Acknowledge ${reqItem.requestCode}`,
      message: `Mark emergency request ${reqItem.requestCode} as Acknowledged and notify ${
        reqItem.patient?.user?.name || 'the patient'
      }?`,
    });
  };

  const handleAllocateBed = async (e) => {
    e.preventDefault();
    if (!activeRequest) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/emergency/${activeRequest._id}/allocate-bed`, bedForm);
      showToast(res.data?.message || 'Bed reserved for emergency patient.');
      setActiveRequest(res.data?.request || null);
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.type === 'acknowledge' && pendingConfirm.requestItem) {
      setSubmitting(true);
      try {
        await api.patch(`/emergency/${pendingConfirm.requestItem._id}`, {
          status: 'Acknowledged',
          adminNote: 'Emergency request acknowledged by hospital administration.',
        });
        showToast(`${pendingConfirm.requestItem.requestCode} acknowledged.`);
        setPendingConfirm(null);
        setActiveRequest(null);
        loadData();
      } catch (err) {
        showToast(getErrorMessage(err), 'error');
        setPendingConfirm(null);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    await submitStatusUpdate();
  };

  const availableDepartmentOptions = inventories
    .filter((inv) => inv.availableBeds > 0)
    .map((inv) => ({
      value: inv._id,
      label: `${inv.department} (${inv.availableBeds} available)`,
    }));

  const columns = [
    {
      key: 'requestCode',
      header: 'Request',
      render: (row) => (
        <div>
          <div className="table-cell-primary mono-text">{row.requestCode}</div>
          <div className="table-cell-sub tabular-nums">
            {formatDateTime(row.submittedAt || row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Phone',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.patient?.user?.name || 'Unknown'}</div>
          <div className="table-cell-sub mono-text">
            {row.patient?.patientCode || '—'} · {row.contactPhone}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category & Location',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.category}</div>
          <div className="table-cell-sub">{row.location}</div>
        </div>
      ),
    },
    {
      key: 'urgencyLevel',
      header: 'Urgency',
      render: (row) => <StatusBadge status={row.urgencyLevel} />,
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
          {row.status === 'New' && (
            <button
              type="button"
              className="btn btn-teal btn-sm"
              onClick={() => handleQuickAcknowledge(row)}
            >
              Acknowledge
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openManageModal(row)}
          >
            <Eye size={14} />
            Manage
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Emergency Management</h1>
          <p>Review incoming patient emergency requests, log manual ambulance coordination, and assign beds.</p>
        </div>
      </div>

      <div className="alert-banner alert-banner--info" role="note">
        <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          Ambulance arrangements logged on this portal record manual coordination by authorized
          administrators. This system does not automatically dispatch external emergency vehicles.
        </span>
      </div>

      <div className="stats-grid stats-grid--three" style={{ marginBottom: '16px' }}>
        <DashboardCard
          label="Total Requests"
          value={summary.total ?? 0}
          hint="All recorded emergency requests"
          icon={Activity}
        />
        <DashboardCard
          label="New Requests"
          value={summary.newCount ?? 0}
          hint="Awaiting initial acknowledgment"
          icon={ShieldAlert}
          tone="teal"
        />
        <DashboardCard
          label="Acknowledged"
          value={summary.acknowledgedCount ?? 0}
          hint="Under active coordination"
          icon={ClipboardCheck}
        />
        <DashboardCard
          label="Ambulances Arranged"
          value={summary.ambulanceArrangedCount ?? 0}
          hint="Manual transport logged"
          icon={Ambulance}
          tone="teal"
        />
        <DashboardCard
          label="Beds Reserved"
          value={summary.bedReservedCount ?? 0}
          hint="Allocated in department wards"
          icon={BedDouble}
        />
        <DashboardCard
          label="Completed"
          value={summary.completedCount ?? 0}
          hint="Resolved emergency requests"
          icon={CheckCircle2}
          tone="teal"
        />
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search request ID, patient, category, location..."
          />
          <div className="toolbar-filters">
            <select
              className="form-control form-control--inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by emergency status"
            >
              <option value="">All Statuses</option>
              {EMERGENCY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="form-control form-control--inline"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              aria-label="Filter by urgency level"
            >
              <option value="">All Urgencies</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          emptyTitle="No emergency requests"
          emptyMessage="Incoming emergency assistance requests from patients will appear here."
        />
      </div>

      <Modal
        isOpen={Boolean(activeRequest)}
        onClose={() => setActiveRequest(null)}
        title={`Coordinate Emergency — ${activeRequest?.requestCode || ''}`}
        size="lg"
      >
        {activeRequest && (
          <div className="dashboard-stack" style={{ gap: '18px' }}>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Patient</span>
                <span className="detail-value">
                  {activeRequest.patient?.user?.name} ({activeRequest.patient?.patientCode || '—'})
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact Phone</span>
                <span className="detail-value tabular-nums">{activeRequest.contactPhone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category & Urgency</span>
                <div className="meta-line">
                  <strong>{activeRequest.category}</strong>
                  <StatusBadge status={activeRequest.urgencyLevel} />
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Status</span>
                <div>
                  <StatusBadge status={activeRequest.status} />
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location / Destination</span>
                <span className="detail-value">{activeRequest.location}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Blood Group & Allergies</span>
                <span className="detail-value">
                  {activeRequest.patient?.bloodGroup || 'Unknown'} ·{' '}
                  {activeRequest.patient?.allergies?.length
                    ? activeRequest.patient.allergies.join(', ')
                    : 'No recorded allergies'}
                </span>
              </div>
            </div>

            <div className="timeline-item">
              <span className="detail-label">Reported Description</span>
              <p style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                {activeRequest.description}
              </p>
            </div>

            <form
              onSubmit={handleUpdateSubmit}
              style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '16px' }}
            >
              <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>
                Status, Manual Ambulance Record & Patient Update
              </h4>
              <div className="form-grid">
                <FormInput
                  label="Request Status"
                  name="status"
                  type="select"
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  options={EMERGENCY_STATUSES}
                />
                <div className="form-field" style={{ justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={updateForm.arranged}
                      onChange={(e) => setUpdateForm({ ...updateForm, arranged: e.target.checked })}
                    />
                    Record Manual Ambulance Arrangement
                  </label>
                </div>

                {updateForm.arranged && (
                  <>
                    <FormInput
                      label="Ambulance Provider / Unit ID"
                      name="providerOrUnit"
                      value={updateForm.providerOrUnit}
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, providerOrUnit: e.target.value })
                      }
                      placeholder="e.g. City EMS Unit #14"
                    />
                    <FormInput
                      label="Transport Contact Phone"
                      name="driverOrContactPhone"
                      value={updateForm.driverOrContactPhone}
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, driverOrContactPhone: e.target.value })
                      }
                      placeholder="e.g. +1 555 0144"
                    />
                    <FormInput
                      label="Arrangement Notes"
                      name="dispatchNotes"
                      value={updateForm.dispatchNotes}
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, dispatchNotes: e.target.value })
                      }
                      placeholder="ETA or manual pickup coordination notes"
                      className="form-grid-full"
                    />
                  </>
                )}

                <FormInput
                  label="Administrative Update (Visible to Patient)"
                  name="adminNote"
                  type="textarea"
                  value={updateForm.adminNote}
                  onChange={(e) => setUpdateForm({ ...updateForm, adminNote: e.target.value })}
                  placeholder="Provide instructions or coordination progress for the patient..."
                  className="form-grid-full"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  Save Status & Notify Patient
                </button>
              </div>
            </form>

            <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '15px', marginBottom: '10px' }}>Bed Assignment</h4>
              {activeRequest.allocatedBedNumber ? (
                <div className="alert-banner alert-banner--success" style={{ marginBottom: 0 }}>
                  <BedDouble size={17} />
                  <span>
                    Reserved Bed <strong>{activeRequest.allocatedBedNumber}</strong> in{' '}
                    <strong>{activeRequest.allocatedDepartment}</strong> (Ref:{' '}
                    <span className="mono-text">{activeRequest.bedAllocation?.allocationCode}</span>)
                  </span>
                </div>
              ) : availableDepartmentOptions.length === 0 ? (
                <div className="alert-banner alert-banner--warning" style={{ marginBottom: 0 }}>
                  <span>
                    No available beds configured. Add or release beds in Bed Management first.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleAllocateBed}>
                  <div className="form-grid">
                    <FormInput
                      label="Department"
                      name="bedInventoryId"
                      type="select"
                      value={bedForm.bedInventoryId}
                      onChange={(e) => setBedForm({ ...bedForm, bedInventoryId: e.target.value })}
                      options={[
                        { value: '', label: 'Select department...' },
                        ...availableDepartmentOptions,
                      ]}
                      required
                    />
                    <FormInput
                      label="Bed Number / Identifier"
                      name="bedNumber"
                      value={bedForm.bedNumber}
                      onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                      placeholder="e.g. ER-04 or CCU-12"
                      required
                    />
                  </div>
                  <div className="form-actions" style={{ marginTop: '12px' }}>
                    <button type="submit" className="btn btn-teal" disabled={submitting}>
                      <BedDouble size={15} />
                      Reserve Bed for Patient
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(pendingConfirm)}
        onClose={() => setPendingConfirm(null)}
        onConfirm={executeConfirmedAction}
        loading={submitting}
        title={pendingConfirm?.title || 'Confirm Emergency Update'}
        confirmLabel="Confirm & Notify"
        message={pendingConfirm?.message || ''}
      />
    </div>
  );
}
