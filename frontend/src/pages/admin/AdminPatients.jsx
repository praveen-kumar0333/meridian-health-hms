import { useState, useEffect, useCallback } from 'react';
import { Archive, Edit2, Eye, Plus, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { formatDate, getErrorMessage } from '../../utils/formatters.js';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  dateOfBirth: '',
  gender: 'Prefer not to say',
  bloodGroup: 'Unknown',
  address: '',
  assignedDoctor: '',
  allergiesText: '',
  chronicText: '',
};

export default function AdminPatients() {
  const { showToast } = useToast();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [viewPatient, setViewPatient] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [patRes, docRes] = await Promise.all([
        api.get('/patients', { params: { search, archived: showArchived } }),
        api.get('/doctors'),
      ]);
      setPatients(patRes.data?.patients || []);
      setDoctors(docRes.data?.doctors || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load patients.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showArchived, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditingPatient(null);
    setForm(EMPTY_FORM);
    setFormModalOpen(true);
  };

  const openEditModal = (patient) => {
    setEditingPatient(patient);
    setForm({
      name: patient.user?.name || '',
      email: patient.user?.email || '',
      password: '',
      phone: patient.user?.phone || '',
      dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : '',
      gender: patient.gender || 'Prefer not to say',
      bloodGroup: patient.bloodGroup || 'Unknown',
      address: patient.address || '',
      assignedDoctor: patient.assignedDoctor?._id || '',
      allergiesText: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : '',
      chronicText: Array.isArray(patient.chronicConditions)
        ? patient.chronicConditions.join(', ')
        : '',
    });
    setFormModalOpen(true);
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        address: form.address,
        assignedDoctor: form.assignedDoctor || null,
        allergies: form.allergiesText.split(',').map((s) => s.trim()).filter(Boolean),
        chronicConditions: form.chronicText.split(',').map((s) => s.trim()).filter(Boolean),
      };

      if (editingPatient) {
        await api.put(`/patients/${editingPatient._id}`, payload);
        showToast('Patient record updated.');
      } else {
        await api.post('/patients', {
          ...payload,
          email: form.email,
          password: form.password || undefined,
        });
        showToast('Patient added successfully.');
      }
      setFormModalOpen(false);
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    if (!assignTarget) return;
    setSubmitting(true);
    try {
      await api.patch(`/patients/${assignTarget._id}/assign-doctor`, {
        doctorId: selectedDoctorId || null,
      });
      showToast('Doctor assignment updated.');
      setAssignTarget(null);
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setSubmitting(true);
    try {
      await api.delete(`/patients/${confirmAction.patient._id}`, {
        params: confirmAction.permanent ? { permanent: 'true' } : {},
      });
      showToast(
        confirmAction.permanent
          ? 'Patient permanently deleted.'
          : confirmAction.patient.isArchived
          ? 'Patient restored.'
          : 'Patient archived.'
      );
      setConfirmAction(null);
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const doctorOptions = [
    { value: '', label: 'Unassigned' },
    ...doctors.map((d) => ({
      value: d._id,
      label: `Dr. ${d.user?.name} (${d.department})`,
    })),
  ];

  const columns = [
    {
      key: 'name',
      header: 'Patient',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.user?.name}</div>
          <div className="table-cell-sub mono-text">
            {row.patientCode || '—'} · {row.user?.email}
          </div>
        </div>
      ),
    },
    {
      key: 'demographics',
      header: 'Gender / Blood',
      render: (row) => `${row.gender} · ${row.bloodGroup}`,
    },
    {
      key: 'phone',
      header: 'Phone',
      tabular: true,
      render: (row) => row.user?.phone || '—',
    },
    {
      key: 'doctor',
      header: 'Assigned Doctor',
      render: (row) =>
        row.assignedDoctor?.user?.name ? `Dr. ${row.assignedDoctor.user.name}` : 'Unassigned',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.isArchived ? 'Archived' : 'Active'} />,
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
            onClick={() => setViewPatient(row)}
            title="View details"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openEditModal(row)}
            title="Edit patient"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setAssignTarget(row);
              setSelectedDoctorId(row.assignedDoctor?._id || '');
            }}
            title="Assign doctor"
          >
            <UserPlus size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setConfirmAction({ patient: row, permanent: false })}
            title={row.isArchived ? 'Restore patient' : 'Archive patient'}
          >
            {row.isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setConfirmAction({ patient: row, permanent: true })}
            title="Delete permanently"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Patient Management</h1>
          <p>Register patients, assign primary doctors, and manage archived records.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            Add Patient
          </button>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, code, email, phone..."
          />
          <div className="segmented-tabs">
            <button
              type="button"
              className={`segmented-tab ${!showArchived ? 'is-active' : ''}`}
              onClick={() => setShowArchived(false)}
            >
              Active Patients
            </button>
            <button
              type="button"
              className={`segmented-tab ${showArchived ? 'is-active' : ''}`}
              onClick={() => setShowArchived(true)}
            >
              Archived
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={patients}
          loading={loading}
          emptyTitle={showArchived ? 'No archived patients' : 'No active patients'}
          emptyMessage="Add a patient or adjust your search filter."
        />
      </div>

      {/* Add / Edit Patient Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingPatient ? 'Edit Patient Details' : 'Register New Patient'}
        size="lg"
      >
        <form onSubmit={handleSavePatient}>
          <div className="form-grid">
            <FormInput
              label="Full Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            {!editingPatient && (
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            )}
            {!editingPatient && (
              <FormInput
                label="Initial Password"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Default: Patient@123"
              />
            )}
            <FormInput
              label="Phone Number"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <FormInput
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
            <FormInput
              label="Gender"
              name="gender"
              type="select"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={['Prefer not to say', 'Female', 'Male', 'Other']}
            />
            <FormInput
              label="Blood Group"
              name="bloodGroup"
              type="select"
              value={form.bloodGroup}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              options={['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
            />
            <FormInput
              label="Assigned Doctor"
              name="assignedDoctor"
              type="select"
              value={form.assignedDoctor}
              onChange={(e) => setForm({ ...form, assignedDoctor: e.target.value })}
              options={doctorOptions}
            />
            <FormInput
              label="Address"
              name="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="form-grid-full"
            />
            <FormInput
              label="Allergies (comma-separated)"
              name="allergiesText"
              value={form.allergiesText}
              onChange={(e) => setForm({ ...form, allergiesText: e.target.value })}
            />
            <FormInput
              label="Chronic Conditions (comma-separated)"
              name="chronicText"
              value={form.chronicText}
              onChange={(e) => setForm({ ...form, chronicText: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFormModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingPatient ? 'Save Changes' : 'Create Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Patient Details Modal */}
      <Modal
        isOpen={Boolean(viewPatient)}
        onClose={() => setViewPatient(null)}
        title="Patient Profile Details"
      >
        {viewPatient && (
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{viewPatient.user?.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Patient Code</span>
              <span className="detail-value mono-text">{viewPatient.patientCode || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{viewPatient.user?.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value tabular-nums">{viewPatient.user?.phone || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date of Birth</span>
              <span className="detail-value tabular-nums">{formatDate(viewPatient.dateOfBirth)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gender / Blood Group</span>
              <span className="detail-value">
                {viewPatient.gender} · {viewPatient.bloodGroup}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Assigned Doctor</span>
              <span className="detail-value">
                {viewPatient.assignedDoctor?.user?.name
                  ? `Dr. ${viewPatient.assignedDoctor.user.name}`
                  : 'Unassigned'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Address</span>
              <span className="detail-value">{viewPatient.address || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Allergies</span>
              <span className="detail-value">
                {viewPatient.allergies?.length ? viewPatient.allergies.join(', ') : 'None recorded'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Chronic Conditions</span>
              <span className="detail-value">
                {viewPatient.chronicConditions?.length
                  ? viewPatient.chronicConditions.join(', ')
                  : 'None recorded'}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Doctor Modal */}
      <Modal
        isOpen={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        title={`Assign Doctor — ${assignTarget?.user?.name || ''}`}
        size="sm"
      >
        <form onSubmit={handleAssignDoctor}>
          <FormInput
            label="Primary Physician"
            name="selectedDoctorId"
            type="select"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            options={doctorOptions}
          />
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAssignTarget(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Assign Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive / Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeConfirmAction}
        loading={submitting}
        title={
          confirmAction?.permanent
            ? 'Permanently Delete Patient'
            : confirmAction?.patient?.isArchived
            ? 'Restore Patient'
            : 'Archive Patient'
        }
        confirmLabel={
          confirmAction?.permanent
            ? 'Delete Permanently'
            : confirmAction?.patient?.isArchived
            ? 'Restore'
            : 'Archive'
        }
        confirmVariant={confirmAction?.permanent ? 'danger' : 'primary'}
        message={
          confirmAction?.permanent
            ? `Are you sure you want to permanently remove ${confirmAction?.patient?.user?.name}? This action cannot be undone.`
            : confirmAction?.patient?.isArchived
            ? `Restore ${confirmAction?.patient?.user?.name} to active patient records?`
            : `Archive ${confirmAction?.patient?.user?.name}? Their portal login will be suspended until restored.`
        }
      />
    </div>
  );
}
