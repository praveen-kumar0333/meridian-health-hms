import { useState, useEffect } from 'react';
import { Calendar, Clock, Save } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import FormInput from '../../components/FormInput.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { getErrorMessage, getTodayString } from '../../utils/formatters.js';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorAvailability() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [availableDays, setAvailableDays] = useState([]);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);

  const [previewDate, setPreviewDate] = useState(getTodayString());
  const [slots, setSlots] = useState([]);
  const [slotMessage, setSlotMessage] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  const doctorId = user?.profile?._id;

  useEffect(() => {
    const profile = user?.profile;
    if (!profile) return;
    setAvailableDays(Array.isArray(profile.availableDays) ? profile.availableDays : []);
    setWorkStart(profile.workingHours?.start || '09:00');
    setWorkEnd(profile.workingHours?.end || '17:00');
  }, [user]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!doctorId || !previewDate) {
        setSlots([]);
        setSlotMessage('');
        return;
      }
      setLoadingSlots(true);
      setSlotMessage('');
      try {
        const res = await api.get('/appointments/availability', {
          params: { doctorId, date: previewDate },
        });
        setSlots(res.data?.slots || []);
        setSlotMessage(res.data?.message || '');
      } catch (err) {
        setSlots([]);
        setSlotMessage(getErrorMessage(err, 'Unable to load slot preview.'));
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [doctorId, previewDate, user?.profile?.workingHours?.start, user?.profile?.workingHours?.end, user?.profile?.availableDays]);

  const toggleDay = (day) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (availableDays.length === 0) {
      showToast('Please select at least one available day.', 'error');
      return;
    }
    if (workStart >= workEnd) {
      showToast('Working hours end time must be after the start time.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/profile', {
        availableDays,
        workingHours: { start: workStart, end: workEnd },
      });
      await refreshUser();
      showToast('Consultation availability updated.');
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update availability.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCount = slots.filter((s) => s.available).length;
  const bookedCount = slots.filter((s) => !s.available).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Consultation Availability</h1>
          <p>Configure your weekly consulting days, shift hours, and inspect live 30-minute booking slots.</p>
        </div>
      </div>

      <div className="stats-grid stats-grid--three">
        <DashboardCard
          label="Active Consulting Days"
          value={`${availableDays.length} / 7`}
          hint="Days enabled for patient booking"
          icon={Calendar}
        />
        <DashboardCard
          label="Daily Shift Window"
          value={`${workStart} – ${workEnd}`}
          hint="30-minute appointment intervals"
          icon={Clock}
          tone="teal"
        />
        <DashboardCard
          label="Selected Date Open Slots"
          value={openCount}
          hint={`${bookedCount} reserved on ${previewDate}`}
          icon={Clock}
        />
      </div>

      <div className="dashboard-split">
        <section className="surface-card">
          <div className="surface-header">
            <h2>Weekly Schedule Settings</h2>
          </div>

          <form className="surface-body" onSubmit={handleSave}>
            <div className="form-grid">
              <FormInput
                label="Shift Start Time"
                name="workStart"
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                required
              />
              <FormInput
                label="Shift End Time"
                name="workEnd"
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                required
              />
            </div>

            <div className="form-field" style={{ marginTop: '16px' }}>
              <span className="form-label">Available Days of Week</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {WEEKDAYS.map((day) => {
                  const active = availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`btn btn-sm ${active ? 'btn-teal' : 'btn-secondary'}`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <span className="form-hint">
                Patients can only book appointments on your active days and within your shift hours.
              </span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-teal" disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving Schedule...' : 'Save Availability'}
              </button>
            </div>
          </form>
        </section>

        <section className="surface-card">
          <div className="surface-header">
            <h2>Daily Slot Preview</h2>
            <input
              type="date"
              className="form-control form-control--inline"
              value={previewDate}
              onChange={(e) => setPreviewDate(e.target.value)}
              aria-label="Preview date"
            />
          </div>

          <div className="surface-body">
            {loadingSlots ? (
              <LoadingSpinner label="Checking slot status..." />
            ) : slots.length === 0 ? (
              <div className="alert-banner alert-banner--info" style={{ marginBottom: 0 }}>
                <span>{slotMessage || 'No slots scheduled for this date.'}</span>
              </div>
            ) : (
              <>
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <div
                      key={slot.startTime}
                      className={`slot-btn ${
                        slot.available ? 'slot-btn--open-preview' : 'slot-btn--booked-preview'
                      }`}
                    >
                      {slot.startTime}
                    </div>
                  ))}
                </div>
                <div className="meta-line" style={{ marginTop: '14px' }}>
                  <span>Teal = Open for booking</span>
                  <span aria-hidden="true">·</span>
                  <span>Gray = Already booked</span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
