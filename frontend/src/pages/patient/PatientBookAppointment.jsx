import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Stethoscope } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import FormInput from '../../components/FormInput.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import {
  formatCurrency,
  getErrorMessage,
  getTodayString,
} from '../../utils/formatters.js';

export default function PatientBookAppointment() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState(getTodayString());
  const [slots, setSlots] = useState([]);
  const [slotMessage, setSlotMessage] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCatalog = async () => {
      setLoadingDoctors(true);
      try {
        const [deptRes, docRes] = await Promise.all([
          api.get('/doctors/departments'),
          api.get('/doctors'),
        ]);
        setDepartments(deptRes.data?.departments || []);
        setDoctors(docRes.data?.doctors || []);
      } catch (err) {
        showToast(getErrorMessage(err, 'Unable to load doctors directory.'), 'error');
      } finally {
        setLoadingDoctors(false);
      }
    };
    loadCatalog();
  }, [showToast]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDoctor || !appointmentDate) {
        setSlots([]);
        setSlotMessage('');
        return;
      }
      setLoadingSlots(true);
      setSlotMessage('');
      try {
        const res = await api.get('/appointments/availability', {
          params: { doctorId: selectedDoctor._id, date: appointmentDate },
        });
        setSlots(res.data?.slots || []);
        setSlotMessage(res.data?.message || '');
      } catch (err) {
        showToast(getErrorMessage(err, 'Unable to check slot availability.'), 'error');
        setSlots([]);
        setSlotMessage('');
      } finally {
        setLoadingSlots(false);
      }
    };
    loadAvailability();
  }, [selectedDoctor, appointmentDate, showToast]);

  const visibleDoctors = selectedDepartment
    ? doctors.filter((d) => d.department === selectedDepartment)
    : doctors;

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) {
      showToast('Please choose a doctor.', 'error');
      return;
    }
    if (!selectedSlot) {
      showToast('Please select an available time slot.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/appointments', {
        doctorId: selectedDoctor._id,
        department: selectedDoctor.department,
        appointmentDate,
        startTime: selectedSlot,
        reason,
        notes,
      });
      showToast('Appointment request submitted successfully.');
      navigate('/patient/appointments');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Book Appointment</h1>
          <p>Select a department, choose an available physician, and reserve an open time slot.</p>
        </div>
      </div>

      <div className="dashboard-split">
        {/* Step 1 & 2: Department + Doctor Picker */}
        <section className="surface-card">
          <div className="surface-header">
            <h2>1. Choose Department & Physician</h2>
            <select
              className="form-control form-control--inline"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedDoctor(null);
                setSelectedSlot('');
              }}
              aria-label="Select department"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.activeDoctors})
                </option>
              ))}
            </select>
          </div>

          <div className="surface-body">
            {loadingDoctors ? (
              <LoadingSpinner label="Loading available physicians..." />
            ) : visibleDoctors.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="No active doctors in this department"
                message="Try selecting another department to view available specialists."
              />
            ) : (
              <div className="doctor-select-grid">
                {visibleDoctors.map((doc) => {
                  const isSelected = selectedDoctor?._id === doc._id;
                  return (
                    <button
                      key={doc._id}
                      type="button"
                      className={`doctor-option-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setSelectedSlot('');
                      }}
                    >
                      <strong style={{ fontSize: '15px' }}>Dr. {doc.user?.name}</strong>
                      <span style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 500 }}>
                        {doc.department} · {doc.specialization}
                      </span>
                      <div className="meta-line">
                        <span>{doc.qualification || 'MD'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{doc.experienceYears} yrs exp</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatCurrency(doc.consultationFee)}</span>
                      </div>
                      <div className="meta-line">
                        <span className="tabular-nums">
                          Hours: {doc.workingHours?.start || '09:00'} – {doc.workingHours?.end || '17:00'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Date, Live Slots, & Submission */}
        <section className="surface-card">
          <div className="surface-header">
            <h2>2. Select Date & Time Slot</h2>
          </div>

          <form className="surface-body" onSubmit={handleBook}>
            {selectedDoctor ? (
              <div className="alert-banner alert-banner--info">
                <CalendarCheck size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  Booking with <strong>Dr. {selectedDoctor.user?.name}</strong> (
                  {selectedDoctor.department}) · Consultation Fee:{' '}
                  <strong className="tabular-nums">{formatCurrency(selectedDoctor.consultationFee)}</strong>
                </div>
              </div>
            ) : (
              <div className="alert-banner alert-banner--info">
                <span>Please select a doctor from the directory to view open time slots.</span>
              </div>
            )}

            <FormInput
              label="Appointment Date"
              name="appointmentDate"
              type="date"
              min={getTodayString()}
              value={appointmentDate}
              onChange={(e) => {
                setAppointmentDate(e.target.value);
                setSelectedSlot('');
              }}
              required
            />

            <div className="form-field">
              <span className="form-label">Available 30-Minute Slots</span>
              {!selectedDoctor ? (
                <span className="form-hint">Select a physician first.</span>
              ) : loadingSlots ? (
                <span className="form-hint">Checking live availability...</span>
              ) : slots.length === 0 ? (
                <span className="form-hint">
                  {slotMessage || 'No available slots found for this date.'}
                </span>
              ) : (
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.available}
                      className={`slot-btn ${selectedSlot === slot.startTime ? 'is-selected' : ''}`}
                      onClick={() => setSelectedSlot(slot.startTime)}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <FormInput
              label="Reason for Visit"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Annual checkup, chest pain follow-up, skin rash..."
              required
            />

            <FormInput
              label="Additional Notes (Optional)"
              name="notes"
              type="textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any symptoms or preferences for the doctor..."
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={submitting || !selectedDoctor || !selectedSlot}
            >
              {submitting ? 'Submitting Request...' : 'Submit Appointment Request'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
