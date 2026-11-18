import { useState, useEffect, useCallback } from 'react';
import { CalendarOff, Check, CheckCheck, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import { getErrorMessage } from '../../utils/formatters.js';

export default function DoctorAppointments() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState('reschedule');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments', {
        params: { search, status: statusFilter, date: dateFilter },
      });
      setAppointments(res.data?.appointments || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load appointments.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, showToast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      showToast(`Appointment updated to ${status}.`);
      loadAppointments();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      if (actionType === 'cancel') {
        await api.patch(`/appointments/${actionTarget._id}/status`, {
          status: 'Cancelled',
          notes: note,
        });
        showToast('Appointment cancelled.');
      } else {
        await api.patch(`/appointments/${actionTarget._id}/status`, {
          rescheduleRequested: true,
          rescheduleNote: note,
        });
        showToast('Reschedule request sent to patient and administration.');
      }
      setActionTarget(null);
      setNote('');
      loadAppointments();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.patient?.user?.name || 'Unknown'}</div>
          <div className="table-cell-sub">{row.patient?.user?.phone || row.patient?.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason for Visit',
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
          {row.status === 'Pending' && (
            <>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => updateStatus(row._id, 'Approved')}
              >
                <Check size={14} />
                Accept
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => updateStatus(row._id, 'Rejected')}
              >
                <XCircle size={14} />
                Reject
              </button>
            </>
          )}
          {row.status === 'Approved' && (
            <button
              type="button"
              className="btn btn-teal btn-sm"
              onClick={() => updateStatus(row._id, 'Completed')}
            >
              <CheckCheck size={14} />
              Complete
            </button>
          )}
          {['Pending', 'Approved'].includes(row.status) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setActionTarget(row);
                setActionType('reschedule');
                setNote('');
              }}
            >
              <CalendarOff size={14} />
              Reschedule / Cancel
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
          <p>Accept or reject assigned appointment requests and manage visit outcomes.</p>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search patient name or visit reason..."
          />
          <div className="toolbar-filters">
            <input
              type="date"
              className="form-control form-control--inline"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <select
              className="form-control form-control--inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={appointments}
          loading={loading}
          emptyTitle="No assigned appointments"
          emptyMessage="Appointments booked with you will appear here."
        />
      </div>

      <Modal
        isOpen={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title="Request Reschedule or Cancel"
        size="sm"
      >
        <form onSubmit={handleActionSubmit}>
          <FormInput
            label="Action"
            name="actionType"
            type="select"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            options={[
              { value: 'reschedule', label: 'Request Reschedule' },
              { value: 'cancel', label: 'Cancel Appointment' },
            ]}
          />
          <FormInput
            label="Reason / Suggested Availability"
            name="note"
            type="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Please share a short note for the patient and admin..."
            required
          />
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActionTarget(null)}
            >
              Back
            </button>
            <button
              type="submit"
              className={`btn ${actionType === 'cancel' ? 'btn-danger' : 'btn-primary'}`}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Confirm'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
