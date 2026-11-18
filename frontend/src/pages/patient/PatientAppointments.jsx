import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { getErrorMessage } from '../../utils/formatters.js';

export default function PatientAppointments() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments', { params: { status: statusFilter } });
      setAppointments(res.data?.appointments || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load appointments.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await api.patch(`/appointments/${cancelTarget._id}/status`, {
        status: 'Cancelled',
      });
      showToast('Appointment cancelled.');
      setCancelTarget(null);
      loadAppointments();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'doctor',
      header: 'Doctor & Department',
      render: (row) => (
        <div>
          <div className="table-cell-primary">Dr. {row.doctor?.user?.name || 'Assigned Doctor'}</div>
          <div className="table-cell-sub">{row.department}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <div>
          <div>{row.reason}</div>
          {row.rescheduleRequested && (
            <div className="table-cell-sub" style={{ color: 'var(--status-warning)' }}>
              Reschedule requested: {row.rescheduleNote}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Date & Time',
      tabular: true,
      render: (row) => `${row.appointmentDate} · ${row.startTime}–${row.endTime}`,
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
          {['Pending', 'Approved'].includes(row.status) && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setCancelTarget(row)}
            >
              <XCircle size={14} />
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Appointments</h1>
          <p>Track appointment confirmations, status updates, and cancel upcoming requests.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/patient/book-appointment" className="btn btn-primary">
            <CalendarPlus size={16} />
            Book Appointment
          </Link>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <div className="segmented-tabs">
            {['', 'Pending', 'Approved', 'Completed', 'Cancelled'].map((st) => (
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
          data={appointments}
          loading={loading}
          emptyTitle="No appointments found"
          emptyMessage="Book your first appointment with a specialist."
          emptyAction={
            <Link to="/patient/book-appointment" className="btn btn-primary btn-sm">
              Book Appointment
            </Link>
          }
        />
      </div>

      <ConfirmationDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={submitting}
        title="Cancel Appointment"
        confirmLabel="Cancel Appointment"
        message={`Cancel your appointment with Dr. ${cancelTarget?.doctor?.user?.name} on ${cancelTarget?.appointmentDate} at ${cancelTarget?.startTime}?`}
      />
    </div>
  );
}
