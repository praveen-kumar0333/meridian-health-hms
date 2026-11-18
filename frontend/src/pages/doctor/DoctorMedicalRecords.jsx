import { useState, useEffect, useCallback } from 'react';
import { Edit2, Eye, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import { formatDate, getErrorMessage } from '../../utils/formatters.js';

const EMPTY_RX = {
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
};

const EMPTY_RECORD = {
  patientId: '',
  symptoms: '',
  diagnosis: '',
  clinicalNotes: '',
  bloodPressure: '',
  heartRate: '',
  temperature: '',
  weight: '',
  followUpDate: '',
  prescriptions: [{ ...EMPTY_RX }],
};

export default function DoctorMedicalRecords() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_RECORD);
  const [submitting, setSubmitting] = useState(false);

  const [viewRecord, setViewRecord] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, patRes] = await Promise.all([
        api.get('/medical-records', { params: { search } }),
        api.get('/patients'),
      ]);
      setRecords(recRes.data?.records || []);
      setPatients(patRes.data?.patients || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load medical records.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm(EMPTY_RECORD);
    setFormOpen(true);
  };

  const openEditModal = (rec) => {
    setEditingRecord(rec);
    setForm({
      patientId: rec.patient?._id || '',
      symptoms: rec.symptoms || '',
      diagnosis: rec.diagnosis || '',
      clinicalNotes: rec.clinicalNotes || '',
      bloodPressure: rec.vitals?.bloodPressure || '',
      heartRate: rec.vitals?.heartRate || '',
      temperature: rec.vitals?.temperature || '',
      weight: rec.vitals?.weight || '',
      followUpDate: rec.followUpDate || '',
      prescriptions:
        rec.prescriptions && rec.prescriptions.length > 0
          ? rec.prescriptions.map((p) => ({ ...p }))
          : [{ ...EMPTY_RX }],
    });
    setFormOpen(true);
  };

  const handleRxChange = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.prescriptions];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, prescriptions: next };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        patientId: form.patientId,
        symptoms: form.symptoms,
        diagnosis: form.diagnosis,
        clinicalNotes: form.clinicalNotes,
        followUpDate: form.followUpDate,
        vitals: {
          bloodPressure: form.bloodPressure,
          heartRate: form.heartRate,
          temperature: form.temperature,
          weight: form.weight,
        },
        prescriptions: form.prescriptions.filter(
          (rx) => rx.medicineName.trim() && rx.dosage.trim() && rx.frequency.trim() && rx.duration.trim()
        ),
      };

      if (editingRecord) {
        await api.put(`/medical-records/${editingRecord._id}`, payload);
        showToast('Medical record updated.');
      } else {
        await api.post('/medical-records', payload);
        showToast('Medical record & prescription saved.');
      }
      setFormOpen(false);
      loadData();
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
          <div className="table-cell-primary">{row.patient?.user?.name}</div>
          <div className="table-cell-sub">{row.patient?.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'diagnosis',
      header: 'Diagnosis',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.diagnosis}</div>
          <div className="table-cell-sub">{row.prescriptions?.length || 0} medication(s)</div>
        </div>
      ),
    },
    {
      key: 'visitDate',
      header: 'Visit Date',
      tabular: true,
      render: (row) => formatDate(row.visitDate),
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
            onClick={() => setViewRecord(row)}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openEditModal(row)}
          >
            <Edit2 size={14} />
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Medical Records</h1>
          <p>Record clinical assessments, diagnoses, vitals, and prescriptions for your patients.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add Medical Record
          </button>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search diagnosis, symptoms, or patient..."
          />
        </div>

        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          emptyTitle="No medical records yet"
          emptyMessage="Add a clinical record for one of your assigned patients."
        />
      </div>

      {/* Add / Edit Record Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingRecord ? 'Edit Medical Record' : 'New Clinical Record & Prescription'}
        size="lg"
      >
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <FormInput
              label="Authorized Patient"
              name="patientId"
              type="select"
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              options={[
                { value: '', label: 'Select patient...' },
                ...patients.map((p) => ({
                  value: p._id,
                  label: `${p.user?.name} (${p.patientCode || p.user?.email})`,
                })),
              ]}
              required
              disabled={Boolean(editingRecord)}
              className="form-grid-full"
            />
            <FormInput
              label="Diagnosis"
              name="diagnosis"
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              placeholder="Primary clinical diagnosis"
              required
              className="form-grid-full"
            />
            <FormInput
              label="Symptoms"
              name="symptoms"
              value={form.symptoms}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              placeholder="Fever, cough, fatigue..."
              className="form-grid-full"
            />
            <FormInput
              label="Blood Pressure"
              name="bloodPressure"
              value={form.bloodPressure}
              onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })}
              placeholder="120/80 mmHg"
            />
            <FormInput
              label="Heart Rate"
              name="heartRate"
              value={form.heartRate}
              onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
              placeholder="72 bpm"
            />
            <FormInput
              label="Temperature"
              name="temperature"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: e.target.value })}
              placeholder="98.6 F"
            />
            <FormInput
              label="Weight"
              name="weight"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder="70 kg"
            />
            <FormInput
              label="Clinical Notes"
              name="clinicalNotes"
              type="textarea"
              value={form.clinicalNotes}
              onChange={(e) => setForm({ ...form, clinicalNotes: e.target.value })}
              className="form-grid-full"
            />
            <FormInput
              label="Recommended Follow-Up Date"
              name="followUpDate"
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="form-label">Prescriptions (Optional)</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    prescriptions: [...prev.prescriptions, { ...EMPTY_RX }],
                  }))
                }
              >
                <Plus size={14} />
                Add Medicine
              </button>
            </div>

            {form.prescriptions.map((rx, idx) => (
              <div key={idx} className="repeater-row">
                <FormInput
                  label={idx === 0 ? 'Medicine' : ''}
                  name={`med-${idx}`}
                  value={rx.medicineName}
                  onChange={(e) => handleRxChange(idx, 'medicineName', e.target.value)}
                  placeholder="Amoxicillin"
                />
                <FormInput
                  label={idx === 0 ? 'Dosage' : ''}
                  name={`dos-${idx}`}
                  value={rx.dosage}
                  onChange={(e) => handleRxChange(idx, 'dosage', e.target.value)}
                  placeholder="500mg"
                />
                <FormInput
                  label={idx === 0 ? 'Frequency' : ''}
                  name={`freq-${idx}`}
                  value={rx.frequency}
                  onChange={(e) => handleRxChange(idx, 'frequency', e.target.value)}
                  placeholder="Twice daily"
                />
                <FormInput
                  label={idx === 0 ? 'Duration' : ''}
                  name={`dur-${idx}`}
                  value={rx.duration}
                  onChange={(e) => handleRxChange(idx, 'duration', e.target.value)}
                  placeholder="7 days"
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={form.prescriptions.length === 1}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      prescriptions: prev.prescriptions.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Medical Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Record Modal */}
      <Modal
        isOpen={Boolean(viewRecord)}
        onClose={() => setViewRecord(null)}
        title="Clinical Record Summary"
      >
        {viewRecord && (
          <div className="dashboard-stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Patient</span>
                <span className="detail-value">{viewRecord.patient?.user?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Visit Date</span>
                <span className="detail-value tabular-nums">{formatDate(viewRecord.visitDate)}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Diagnosis</span>
                <span className="detail-value">{viewRecord.diagnosis}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Clinical Notes</span>
                <span className="detail-value">{viewRecord.clinicalNotes || '—'}</span>
              </div>
            </div>
            {viewRecord.prescriptions?.length > 0 && (
              <div className="dashboard-stack" style={{ gap: '8px' }}>
                <h4 style={{ fontSize: '14px' }}>Prescriptions</h4>
                {viewRecord.prescriptions.map((rx, idx) => (
                  <div key={idx} className="prescription-card">
                    <strong>{rx.medicineName}</strong>
                    <div className="meta-line">
                      <span>{rx.dosage}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rx.frequency}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rx.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
