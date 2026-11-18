import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Building2, Edit2, Eye, Plus, Power } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import {
  DEPARTMENT_OPTIONS,
  formatCurrency,
  getErrorMessage,
} from '../../utils/formatters.js';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY_DOCTOR = {
  name: '',
  email: '',
  password: '',
  phone: '',
  department: 'General Medicine',
  specialization: '',
  qualification: 'MBBS, MD',
  experienceYears: 5,
  consultationFee: 120,
  workStart: '09:00',
  workEnd: '17:00',
  availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  bio: '',
};

export default function AdminDoctors() {
  const { showToast } = useToast();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [viewDoctor, setViewDoctor] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_DOCTOR);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, deptRes] = await Promise.all([
        api.get('/doctors', {
          params: {
            includeInactive: 'true',
            search,
            department: departmentFilter,
          },
        }),
        api.get('/doctors/departments'),
      ]);
      setDoctors(docRes.data?.doctors || []);
      setDepartments(deptRes.data?.departments || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load doctors.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter, showToast]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const openAddModal = () => {
    setEditingDoctor(null);
    setForm(EMPTY_DOCTOR);
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setFormError('');
    setForm({
      name: doc.user?.name || '',
      email: doc.user?.email || '',
      password: '',
      phone: doc.user?.phone || '',
      department: doc.department || 'General Medicine',
      specialization: doc.specialization || '',
      qualification: doc.qualification || '',
      experienceYears: doc.experienceYears ?? 0,
      consultationFee: doc.consultationFee ?? 100,
      workStart: doc.workingHours?.start || '09:00',
      workEnd: doc.workingHours?.end || '17:00',
      availableDays: doc.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      bio: doc.bio || '',
    });
    setFormOpen(true);
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError('Doctor full name must be at least 2 characters.');
      return;
    }

    if (!editingDoctor) {
      if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
        setFormError('Please enter a valid email address for the doctor.');
        return;
      }
      if (!form.password || form.password.length < 6) {
        setFormError('Initial password must be at least 6 characters.');
        return;
      }
    }

    if (!form.department || !form.specialization.trim()) {
      setFormError('Department and specialization are required.');
      return;
    }

    if (form.workStart && form.workEnd && form.workStart >= form.workEnd) {
      setFormError('Shift end time must be after shift start time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        department: form.department,
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        consultationFee: Number(form.consultationFee) || 0,
        availableDays: form.availableDays,
        workingHours: { start: form.workStart, end: form.workEnd },
        bio: form.bio.trim(),
      };

      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor._id}`, payload);
        showToast('Doctor profile updated.');
        setFormOpen(false);
        loadDoctors();
      } else {
        await api.post('/doctors', {
          ...payload,
          email: form.email.trim(),
          password: form.password,
        });
        showToast('Doctor added successfully. They can now sign in with this email and password.');
        setFormOpen(false);
        if (departmentFilter && departmentFilter !== form.department) {
          setDepartmentFilter('');
        }
        if (search) {
          setSearch('');
        }
        loadDoctors();
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to save doctor.');
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setSubmitting(true);
    try {
      await api.patch(`/doctors/${toggleTarget._id}/status`);
      showToast(
        toggleTarget.isActive ? 'Doctor account deactivated.' : 'Doctor account activated.'
      );
      setToggleTarget(null);
      loadDoctors();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Physician',
      render: (row) => (
        <div>
          <div className="table-cell-primary">Dr. {row.user?.name}</div>
          <div className="table-cell-sub mono-text">
            {row.employeeId || '—'} · {row.user?.email}
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department & Specialty',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.department}</div>
          <div className="table-cell-sub">{row.specialization}</div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Hours',
      tabular: true,
      render: (row) => `${row.workingHours?.start || '09:00'} – ${row.workingHours?.end || '17:00'}`,
    },
    {
      key: 'fee',
      header: 'Fee',
      align: 'right',
      tabular: true,
      render: (row) => formatCurrency(row.consultationFee),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} />,
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
            onClick={() => setViewDoctor(row)}
            title="View details"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openEditModal(row)}
            title="Edit doctor"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            className={`btn btn-sm ${row.isActive ? 'btn-danger' : 'btn-success'}`}
            onClick={() => setToggleTarget(row)}
            title={row.isActive ? 'Deactivate' : 'Activate'}
          >
            <Power size={14} />
            {row.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Doctor & Department Management</h1>
          <p>Onboard physicians, manage clinical departments, and control active access.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDeptModalOpen(true)}
          >
            <Building2 size={16} />
            Departments
          </button>
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            Add Doctor
          </button>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search doctors by name, specialty, ID..."
          />
          <div className="toolbar-filters">
            <select
              className="form-control form-control--inline"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              {DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={doctors}
          loading={loading}
          emptyTitle="No doctors found"
          emptyMessage="Add a doctor or select a different department filter."
        />
      </div>

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingDoctor ? 'Edit Doctor Details' : 'Add New Doctor'}
        size="lg"
      >
        <form onSubmit={handleSave} noValidate>
          {formError && (
            <div className="alert-banner alert-banner--error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-grid">
            <FormInput
              label="Full Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sarah Jenkins"
              required
            />
            {!editingDoctor && (
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="doctor@hospital.org"
                required
              />
            )}
            {!editingDoctor && (
              <FormInput
                label="Initial Password"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                hint="The doctor will use this email and password to sign in."
                required
              />
            )}
            <FormInput
              label="Phone Number"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <FormInput
              label="Department"
              name="department"
              type="select"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              options={DEPARTMENT_OPTIONS}
              required
            />
            <FormInput
              label="Specialization"
              name="specialization"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder="Interventional Cardiology"
              required
            />
            <FormInput
              label="Qualification"
              name="qualification"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
            />
            <FormInput
              label="Experience (Years)"
              name="experienceYears"
              type="number"
              min="0"
              value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
            />
            <FormInput
              label="Consultation Fee ($)"
              name="consultationFee"
              type="number"
              min="0"
              value={form.consultationFee}
              onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
            />
            <FormInput
              label="Shift Start"
              name="workStart"
              type="time"
              value={form.workStart}
              onChange={(e) => setForm({ ...form, workStart: e.target.value })}
            />
            <FormInput
              label="Shift End"
              name="workEnd"
              type="time"
              value={form.workEnd}
              onChange={(e) => setForm({ ...form, workEnd: e.target.value })}
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
              label="Bio"
              name="bio"
              type="textarea"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="form-grid-full"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Doctor Details Modal */}
      <Modal
        isOpen={Boolean(viewDoctor)}
        onClose={() => setViewDoctor(null)}
        title="Physician Profile"
      >
        {viewDoctor && (
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Name</span>
              <span className="detail-value">Dr. {viewDoctor.user?.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Employee ID</span>
              <span className="detail-value mono-text">{viewDoctor.employeeId || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Department</span>
              <span className="detail-value">{viewDoctor.department}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Specialization</span>
              <span className="detail-value">{viewDoctor.specialization}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Qualification</span>
              <span className="detail-value">{viewDoctor.qualification || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Experience & Fee</span>
              <span className="detail-value tabular-nums">
                {viewDoctor.experienceYears} yrs · {formatCurrency(viewDoctor.consultationFee)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Available Days</span>
              <span className="detail-value">
                {(viewDoctor.availableDays || []).join(', ')}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Working Hours</span>
              <span className="detail-value tabular-nums">
                {viewDoctor.workingHours?.start} – {viewDoctor.workingHours?.end}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Departments Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Hospital Clinical Departments"
      >
        <div className="feed-list">
          {departments.map((dept) => (
            <div key={dept.name} className="feed-item" style={{ padding: '10px 4px' }}>
              <span style={{ fontWeight: 600 }}>{dept.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {dept.activeDoctors} active doctor(s)
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setDepartmentFilter(dept.name);
                    setDeptModalOpen(false);
                  }}
                >
                  Filter
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        loading={submitting}
        title={toggleTarget?.isActive ? 'Deactivate Doctor' : 'Activate Doctor'}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        confirmVariant={toggleTarget?.isActive ? 'danger' : 'teal'}
        message={
          toggleTarget?.isActive
            ? `Deactivate Dr. ${toggleTarget?.user?.name}? They will no longer appear for new bookings or be able to sign in.`
            : `Activate Dr. ${toggleTarget?.user?.name} and restore scheduling access?`
        }
      />
    </div>
  );
}
