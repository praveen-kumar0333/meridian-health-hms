import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Ambulance, BedDouble, CheckCircle2, Clock, Eye, RefreshCw, Send } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import FormInput from '../../components/FormInput.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDateTime, getErrorMessage } from '../../utils/formatters.js';

const CATEGORY_OPTIONS = [
  'Cardiac / Chest Pain',
  'Breathing Difficulty',
  'Trauma / Injury',
  'Neurological / Stroke Symptoms',
  'High Fever / Infection',
  'Obstetric Emergency',
  'Severe Pain / Acute Illness',
  'Other Medical Emergency',
];

const URGENCY_OPTIONS = [
  { value: 'Critical', label: 'Critical — Immediate life/limb risk' },
  { value: 'High', label: 'High — Urgent medical attention needed' },
  { value: 'Moderate', label: 'Moderate — Prompt assessment requested' },
];

export default function PatientEmergency() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [latestSubmitted, setLatestSubmitted] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [form, setForm] = useState({
    category: CATEGORY_OPTIONS[0],
    urgencyLevel: 'High',
    contactPhone: user?.phone || '',
    location: user?.profile?.address || '',
    description: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      contactPhone: prev.contactPhone || user?.phone || '',
      location: prev.location || user?.profile?.address || '',
    }));
  }, [user]);

  const loadRequests = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const res = await api.get('/emergency');
        const list = res.data?.requests || [];
        setRequests(list);
        setSelectedRequest((prev) =>
          prev ? list.find((item) => item._id === prev._id) || prev : null
        );
      } catch (err) {
        if (!silent) {
          showToast(getErrorMessage(err, 'Unable to load emergency requests.'), 'error');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadRequests();
    const timer = setInterval(() => loadRequests({ silent: true }), 15000);
    return () => clearInterval(timer);
  }, [loadRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.contactPhone.trim()) {
      setFormError('Please enter a contact phone number.');
      return;
    }
    if (!form.location.trim()) {
      setFormError('Please provide your current location or hospital destination.');
      return;
    }
    if (form.description.trim().length < 5) {
      setFormError('Please describe the emergency (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/emergency', {
        category: form.category,
        urgencyLevel: form.urgencyLevel,
        contactPhone: form.contactPhone.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
      });
      const created = res.data?.request;
      setLatestSubmitted(created);
      setForm((prev) => ({ ...prev, description: '' }));
      showToast(`Emergency request ${created?.requestCode || ''} submitted.`);
      loadRequests();
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to submit emergency request.');
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'requestCode',
      header: 'Request ID',
      render: (row) => (
        <div>
          <div className="table-cell-primary mono-text">{row.requestCode}</div>
          <div className="table-cell-sub tabular-nums">{formatDateTime(row.submittedAt || row.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Emergency Details',
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
      key: 'arrangement',
      header: 'Coordination',
      render: (row) => {
        if (row.allocatedBedNumber) {
          return (
            <span className="table-cell-primary">
              Bed {row.allocatedBedNumber} ({row.allocatedDepartment})
            </span>
          );
        }
        if (row.ambulanceArrangement?.arranged) {
          return (
            <span className="table-cell-primary">
              Ambulance: {row.ambulanceArrangement.providerOrUnit || 'Logged'}
            </span>
          );
        }
        return <span className="table-cell-sub">Awaiting coordinator review</span>;
      },
    },
    {
      key: 'actions',
      header: 'Updates',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedRequest(row)}
        >
          <Eye size={14} />
          View Updates
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Emergency Assistance</h1>
          <p>Submit urgent assistance requests to hospital administration and track coordination updates.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => loadRequests()}>
            <RefreshCw size={15} />
            Refresh Status
          </button>
        </div>
      </div>

      <div className="emergency-callout" role="alert">
        <div className="emergency-callout-body">
          <div className="emergency-callout-icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="emergency-callout-title">Important Emergency Notice</div>
            <p className="emergency-callout-text">
              Submitting an emergency request does not automatically dispatch an ambulance. For
              life-threatening emergencies, contact local emergency services immediately.
            </p>
          </div>
        </div>
      </div>

      {latestSubmitted && (
        <div className="alert-banner alert-banner--success" role="status">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Request Confirmed — {latestSubmitted.requestCode}</strong>
            <div style={{ marginTop: '2px' }}>
              Submitted on <span className="tabular-nums">{formatDateTime(latestSubmitted.submittedAt)}</span>.
              Current status: <strong>{latestSubmitted.status}</strong>. Hospital administrators have
              been notified.
            </div>
          </div>
        </div>
      )}

      <div className="context-strip">
        <div className="context-strip-main">
          <span className="context-strip-title">Authenticated Patient Session</span>
          <div className="meta-line">
            <span>{user?.name}</span>
            <span aria-hidden="true">·</span>
            <span>
              Patient ID: <strong className="mono-text">{user?.profile?.patientCode || '—'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>Blood Group: {user?.profile?.bloodGroup || 'Unknown'}</span>
            <span aria-hidden="true">·</span>
            <span>{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-split">
        <section className="surface-card">
          <div className="surface-header">
            <h2>Request Emergency Assistance</h2>
          </div>
          <form className="surface-body" onSubmit={handleSubmit}>
            {formError && (
              <div className="alert-banner alert-banner--error" role="alert">
                <span>{formError}</span>
              </div>
            )}

            <div className="form-grid">
              <FormInput
                label="Emergency Category"
                name="category"
                type="select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORY_OPTIONS}
                required
              />
              <FormInput
                label="Urgency Level"
                name="urgencyLevel"
                type="select"
                value={form.urgencyLevel}
                onChange={(e) => setForm({ ...form, urgencyLevel: e.target.value })}
                options={URGENCY_OPTIONS}
                required
              />
              <FormInput
                label="Contact Phone Number"
                name="contactPhone"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="+1 555 0100"
                required
              />
              <FormInput
                label="Current Location or Hospital Destination"
                name="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Street address, landmark, or Meridian Main Campus ER"
                required
              />
              <FormInput
                label="Emergency Description"
                name="description"
                type="textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe symptoms, condition, or assistance needed..."
                required
                className="form-grid-full"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Send size={15} />
                {submitting ? 'Submitting Request...' : 'Submit Emergency Request'}
              </button>
            </div>
          </form>
        </section>

        <section className="surface-card">
          <div className="surface-header">
            <h2>Latest Request Status</h2>
          </div>
          <div className="surface-body">
            {requests.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No emergency requests"
                message="Your submitted emergency requests and coordinator updates will appear here."
              />
            ) : (
              <div className="dashboard-stack" style={{ gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong className="mono-text">{requests[0].requestCode}</strong>
                  <StatusBadge status={requests[0].status} />
                </div>
                <div className="meta-line">
                  <span>{requests[0].category}</span>
                  <span aria-hidden="true">·</span>
                  <StatusBadge status={requests[0].urgencyLevel} />
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                  {requests[0].description}
                </p>

                {requests[0].ambulanceArrangement?.arranged && (
                  <div className="timeline-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Ambulance size={15} />
                      <span>Ambulance Arrangement Logged</span>
                    </div>
                    <div className="meta-line">
                      <span>{requests[0].ambulanceArrangement.providerOrUnit || 'Assigned transport'}</span>
                      {requests[0].ambulanceArrangement.driverOrContactPhone && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {requests[0].ambulanceArrangement.driverOrContactPhone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {requests[0].allocatedBedNumber && (
                  <div className="timeline-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <BedDouble size={15} />
                      <span>
                        Bed Reserved: {requests[0].allocatedBedNumber} ({requests[0].allocatedDepartment})
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedRequest(requests[0])}
                >
                  Open Full Timeline
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="surface-card" style={{ marginTop: '20px' }}>
        <div className="surface-header">
          <h2>My Emergency Requests History</h2>
        </div>
        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          emptyTitle="No emergency requests submitted"
          emptyMessage="Submitted requests will display here with live status updates."
        />
      </section>

      <Modal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title={`Emergency Request — ${selectedRequest?.requestCode || ''}`}
      >
        {selectedRequest && (
          <div className="dashboard-stack" style={{ gap: '16px' }}>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Current Status</span>
                <div>
                  <StatusBadge status={selectedRequest.status} />
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Urgency</span>
                <div>
                  <StatusBadge status={selectedRequest.urgencyLevel} />
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">{selectedRequest.category}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Submitted</span>
                <span className="detail-value tabular-nums">
                  {formatDateTime(selectedRequest.submittedAt || selectedRequest.createdAt)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact Phone</span>
                <span className="detail-value tabular-nums">{selectedRequest.contactPhone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location / Destination</span>
                <span className="detail-value">{selectedRequest.location}</span>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Reported Details</span>
              <p style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                {selectedRequest.description}
              </p>
            </div>

            {selectedRequest.ambulanceArrangement?.arranged && (
              <div className="timeline-item">
                <strong>Ambulance Arrangement Details</strong>
                <div className="meta-line">
                  <span>Unit/Provider: {selectedRequest.ambulanceArrangement.providerOrUnit || '—'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Contact: {selectedRequest.ambulanceArrangement.driverOrContactPhone || '—'}
                  </span>
                </div>
                {selectedRequest.ambulanceArrangement.dispatchNotes && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selectedRequest.ambulanceArrangement.dispatchNotes}
                  </p>
                )}
              </div>
            )}

            {selectedRequest.allocatedBedNumber && (
              <div className="timeline-item">
                <strong>Hospital Bed Reservation</strong>
                <div className="meta-line">
                  <span>Department: {selectedRequest.allocatedDepartment}</span>
                  <span aria-hidden="true">·</span>
                  <span>Bed: {selectedRequest.allocatedBedNumber}</span>
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '14.5px', marginBottom: '10px' }}>Administrative Updates</h4>
              {!selectedRequest.adminUpdates || selectedRequest.adminUpdates.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  No coordinator updates posted yet. Your request is queued for review.
                </p>
              ) : (
                <div className="timeline-list">
                  {[...selectedRequest.adminUpdates].reverse().map((upd, idx) => (
                    <div key={upd._id || idx} className="timeline-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <StatusBadge status={upd.statusAtUpdate} />
                        <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatDateTime(upd.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{upd.message}</p>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Updated by {upd.updatedByName || 'Administrator'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
