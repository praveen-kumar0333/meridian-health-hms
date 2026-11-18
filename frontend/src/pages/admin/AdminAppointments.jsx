import { useState, useEffect, useCallback } from 'react';
import { CalendarPlus, Check, Edit3, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import {
  DEPARTMENT_OPTIONS,
  getErrorMessage,
  getTodayString,
} from '../../utils/formatters.js';

export default function AdminAppointments() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState({
    patientId: '',
    department: '',
    doctorId: '',
    appointmentDate: getTodayString(),
    startTime: '',
    reason: '',
    status: 'Approved',
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    doctorId: '',
    appointmentDate: '',
    startTime: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, patRes, docRes] = await Promise.all([
        api.get('/appointments', {
          params: { search, status: statusFilter, date: dateFilter },
        }),
        api.get('/patients'),
        api.get('/doctors'),
      ]);
      setAppointments(apptRes.data?.appointments || []);
      setPatients(patRes.data?.patients || []);
      setDoctors(docRes.data?.doctors || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load appointments.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!bookForm.doctorId || !bookForm.appointmentDate) {
        setSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const res = await api.get('/appointments/availability', {
          params: {
            doctorId: bookForm.doctorId,
            date: bookForm.appointmentDate,
          },
        });
        setSlots(res.data?.slots || []);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    if (bookModalOpen) {
      fetchSlots();
    }
  }, [bookModalOpen, bookForm.doctorId, bookForm.appointmentDate]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      showToast(`Appointment marked as ${status}.`);
      loadAll();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!bookForm.startTime) {
      showToast('Please select an available time slot.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/appointments', bookForm);
      showToast('Appointment created successfully.');
      setBookModalOpen(false);
      setBookForm({
        patientId: '',
        department: '',
        doctorId: '',
        appointmentDate: getTodayString(),
        startTime: '',
        reason: '',
        status: 'Approved',
      });
      loadAll();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openRescheduleModal = (appt) => {
    setRescheduleTarget(appt);
    setRescheduleForm({
      doctorId: appt.doctor?._id || '',
      appointmentDate: appt.appointmentDate || getTodayString(),
      startTime: appt.startTime || '09:00',
      notes: appt.notes || '',
    });
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    setSubmitting(true);
    try {
      await api.put(`/appointments/${rescheduleTarget._id}`, rescheduleForm);
      showToast('Appointment reassigned / rescheduled.');
      setRescheduleTarget(null);
      loadAll();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDoctors = bookForm.department
    ? doctors.filter((d) => d.department === bookForm.department)
    : doctors;

  const columns = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.patient?.user?.name || 'Unknown'}</div>
          <div className="table-cell-sub">{row.reason}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor & Department',
      render: (row) => (
        <div>
          <div className="table-cell-primary">Dr. {row.doctor?.user?.name || 'Unassigned'}</div>
          <div className="table-cell-sub">{row.department}</div>
        </div>
      ),
    },
    {
      key: 'datetime',
      header: 'Date & Slot',
      tabular: true,
      render: (row) => `${row.appointmentDate} · ${row.startTime}–${row.endTime}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          <StatusBadge status={row.status} />
          {row.rescheduleRequested && (
            <div className="table-cell-sub" style={{ color: 'var(--status-warning)' }}>
              Reschedule requested
            </div>
          )}
        </div>
      ),
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
                onClick={() => handleStatusChange(row._id, 'Approved')}
                title="Approve"
              >
                <Check size={14} />
                Approve
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleStatusChange(row._id, 'Rejected')}
                title="Reject"
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
              onClick={() => handleStatusChange(row._id, 'Completed')}
            >
              Complete
            </button>
          )}
          {['Pending', 'Approved'].includes(row.status) && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openRescheduleModal(row)}
                title="Reschedule / Reassign"
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleStatusChange(row._id, 'Cancelled')}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Appointment Management</h1>
          <p>Review requests, prevent overlapping bookings, and assign doctors.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setBookModalOpen(true)}
          >
            <CalendarPlus size={16} />
            Book Appointment
          </button>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search patient, doctor, or reason..."
          />
          <div className="toolbar-filters">
            <input
              type="date"
              className="form-control form-control--inline"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
            />
            <select
              className="form-control form-control--inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {(dateFilter || statusFilter) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDateFilter('');
                  setStatusFilter('');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={appointments}
          loading={loading}
          emptyTitle="No appointments found"
          emptyMessage="Try clearing your date or status filters, or book a new appointment."
        />
      </div>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        title="Schedule Appointment"
        size="lg"
      >
        <form onSubmit={handleBookSubmit}>
          <div className="form-grid">
            <FormInput
              label="Patient"
              name="patientId"
              type="select"
              value={bookForm.patientId}
              onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
              options={[
                { value: '', label: 'Select patient...' },
                ...patients.map((p) => ({
                  value: p._id,
                  label: `${p.user?.name} (${p.patientCode || p.user?.email})`,
                })),
              ]}
              required
            />
            <FormInput
              label="Department"
              name="department"
              type="select"
              value={bookForm.department}
              onChange={(e) =>
                setBookForm({
                  ...bookForm,
                  department: e.target.value,
                  doctorId: '',
                  startTime: '',
                })
              }
              options={[
                { value: '', label: 'All Departments' },
                ...DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
              ]}
            />
            <FormInput
              label="Doctor"
              name="doctorId"
              type="select"
              value={bookForm.doctorId}
              onChange={(e) =>
                setBookForm({ ...bookForm, doctorId: e.target.value, startTime: '' })
              }
              options={[
                { value: '', label: 'Select doctor...' },
                ...filteredDoctors.map((d) => ({
                  value: d._id,
                  label: `Dr. ${d.user?.name} (${d.department})`,
                })),
              ]}
              required
            />
            <FormInput
              label="Appointment Date"
              name="appointmentDate"
              type="date"
              value={bookForm.appointmentDate}
              onChange={(e) =>
                setBookForm({ ...bookForm, appointmentDate: e.target.value, startTime: '' })
              }
              required
            />
          </div>

          <div className="form-field" style={{ marginTop: '14px' }}>
            <span className="form-label">Available Time Slots</span>
            {!bookForm.doctorId ? (
              <span className="form-hint">Select a doctor and date to view available slots.</span>
            ) : loadingSlots ? (
              <span className="form-hint">Checking doctor availability...</span>
            ) : slots.length === 0 ? (
              <span className="form-hint">No slots available for this selection.</span>
            ) : (
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={!slot.available}
                    className={`slot-btn ${
                      bookForm.startTime === slot.startTime ? 'is-selected' : ''
                    }`}
                    onClick={() => setBookForm({ ...bookForm, startTime: slot.startTime })}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-grid" style={{ marginTop: '14px' }}>
            <FormInput
              label="Initial Status"
              name="status"
              type="select"
              value={bookForm.status}
              onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}
              options={['Approved', 'Pending']}
            />
            <FormInput
              label="Reason for Visit"
              name="reason"
              value={bookForm.reason}
              onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
              placeholder="Consultation / follow-up..."
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setBookModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule / Reassign Modal */}
      <Modal
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule or Reassign Doctor"
      >
        <form onSubmit={handleRescheduleSubmit}>
          <div className="form-grid">
            <FormInput
              label="Assigned Doctor"
              name="doctorId"
              type="select"
              value={rescheduleForm.doctorId}
              onChange={(e) =>
                setRescheduleForm({ ...rescheduleForm, doctorId: e.target.value })
              }
              options={doctors.map((d) => ({
                value: d._id,
                label: `Dr. ${d.user?.name} (${d.department})`,
              }))}
              required
              className="form-grid-full"
            />
            <FormInput
              label="Date"
              name="appointmentDate"
              type="date"
              value={rescheduleForm.appointmentDate}
              onChange={(e) =>
                setRescheduleForm({ ...rescheduleForm, appointmentDate: e.target.value })
              }
              required
            />
            <FormInput
              label="Start Time"
              name="startTime"
              type="time"
              value={rescheduleForm.startTime}
              onChange={(e) =>
                setRescheduleForm({ ...rescheduleForm, startTime: e.target.value })
              }
              required
            />
            <FormInput
              label="Administrative Notes"
              name="notes"
              type="textarea"
              value={rescheduleForm.notes}
              onChange={(e) => setRescheduleForm({ ...rescheduleForm, notes: e.target.value })}
              className="form-grid-full"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRescheduleTarget(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Update Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
