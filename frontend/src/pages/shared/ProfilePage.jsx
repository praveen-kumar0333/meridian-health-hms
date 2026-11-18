import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import FormInput from '../../components/FormInput.jsx';
import { getErrorMessage } from '../../utils/formatters.js';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    bloodGroup: 'Unknown',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    allergiesText: '',
    chronicText: '',
    qualification: '',
    bio: '',
    workStart: '09:00',
    workEnd: '17:00',
    availableDays: [],
  });

  useEffect(() => {
    if (!user) return;
    const p = user.profile || {};
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : '',
      gender: p.gender || 'Prefer not to say',
      bloodGroup: p.bloodGroup || 'Unknown',
      address: p.address || '',
      emergencyName: p.emergencyContact?.name || '',
      emergencyPhone: p.emergencyContact?.phone || '',
      emergencyRelationship: p.emergencyContact?.relationship || '',
      allergiesText: Array.isArray(p.allergies) ? p.allergies.join(', ') : '',
      chronicText: Array.isArray(p.chronicConditions) ? p.chronicConditions.join(', ') : '',
      qualification: p.qualification || '',
      bio: p.bio || '',
      workStart: p.workingHours?.start || '09:00',
      workEnd: p.workingHours?.end || '17:00',
      availableDays: Array.isArray(p.availableDays) ? p.availableDays : [],
    });
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
      };

      if (user.role === 'patient') {
        payload.dateOfBirth = form.dateOfBirth || null;
        payload.gender = form.gender;
        payload.bloodGroup = form.bloodGroup;
        payload.address = form.address;
        payload.emergencyContact = {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relationship: form.emergencyRelationship,
        };
        payload.allergies = form.allergiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        payload.chronicConditions = form.chronicText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (user.role === 'doctor') {
        payload.qualification = form.qualification;
        payload.bio = form.bio;
        payload.availableDays = form.availableDays;
        payload.workingHours = { start: form.workStart, end: form.workEnd };
      }

      await api.put('/auth/profile', payload);
      await refreshUser();
      showToast('Profile updated successfully.');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your personal contact information and permitted account settings.</p>
        </div>
      </div>

      <div className="surface-card">
        <div className="surface-header">
          <div>
            <h2>Account Details</h2>
            <div className="meta-line" style={{ marginTop: '4px' }}>
              <span>{user?.email}</span>
              <span aria-hidden="true">·</span>
              <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
              {user?.profile?.patientCode && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="mono-text">{user.profile.patientCode}</span>
                </>
              )}
              {user?.profile?.employeeId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="mono-text">{user.profile.employeeId}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <form className="surface-body" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormInput
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <FormInput
              label="Phone Number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />

            {user?.role === 'patient' && (
              <>
                <FormInput
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                />
                <FormInput
                  label="Gender"
                  name="gender"
                  type="select"
                  value={form.gender}
                  onChange={handleChange}
                  options={['Prefer not to say', 'Female', 'Male', 'Other']}
                />
                <FormInput
                  label="Blood Group"
                  name="bloodGroup"
                  type="select"
                  value={form.bloodGroup}
                  onChange={handleChange}
                  options={['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                />
                <FormInput
                  label="Residential Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
                <FormInput
                  label="Emergency Contact Name"
                  name="emergencyName"
                  value={form.emergencyName}
                  onChange={handleChange}
                />
                <FormInput
                  label="Emergency Contact Phone"
                  name="emergencyPhone"
                  value={form.emergencyPhone}
                  onChange={handleChange}
                />
                <FormInput
                  label="Relationship"
                  name="emergencyRelationship"
                  value={form.emergencyRelationship}
                  onChange={handleChange}
                />
                <FormInput
                  label="Known Allergies (comma-separated)"
                  name="allergiesText"
                  value={form.allergiesText}
                  onChange={handleChange}
                  placeholder="Penicillin, Peanuts"
                />
                <FormInput
                  label="Chronic Conditions (comma-separated)"
                  name="chronicText"
                  value={form.chronicText}
                  onChange={handleChange}
                  placeholder="Asthma, Hypertension"
                  className="form-grid-full"
                />
              </>
            )}

            {user?.role === 'doctor' && (
              <>
                <FormInput
                  label="Department (managed by Admin)"
                  name="departmentDisplay"
                  value={user?.profile?.department || ''}
                  onChange={() => {}}
                  disabled
                />
                <FormInput
                  label="Specialization (managed by Admin)"
                  name="specDisplay"
                  value={user?.profile?.specialization || ''}
                  onChange={() => {}}
                  disabled
                />
                <FormInput
                  label="Qualification"
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  className="form-grid-full"
                />
                <FormInput
                  label="Working Hours Start"
                  name="workStart"
                  type="time"
                  value={form.workStart}
                  onChange={handleChange}
                />
                <FormInput
                  label="Working Hours End"
                  name="workEnd"
                  type="time"
                  value={form.workEnd}
                  onChange={handleChange}
                />
                <div className="form-field form-grid-full">
                  <span className="form-label">Available Days</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {WEEKDAYS.map((day) => {
                      const active = form.availableDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => toggleDay(day)}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <FormInput
                  label="Clinical Bio"
                  name="bio"
                  type="textarea"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Brief clinical background and care focus..."
                  className="form-grid-full"
                />
              </>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
