import { useState, useEffect, useCallback } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.jsx';
import { formatDate, getErrorMessage } from '../../utils/formatters.js';

export default function AdminMedicalRecords() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, patRes] = await Promise.all([
        api.get('/medical-records', {
          params: { search, patientId: patientFilter },
        }),
        api.get('/patients'),
      ]);
      setRecords(recRes.data?.records || []);
      setPatients(patRes.data?.patients || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load medical records.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, patientFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.delete(`/medical-records/${deleteTarget._id}`);
      showToast('Medical record deleted.');
      setDeleteTarget(null);
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
          <div className="table-cell-primary">{row.patient?.user?.name || 'Unknown'}</div>
          <div className="table-cell-sub">{row.patient?.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Attending Doctor',
      render: (row) => `Dr. ${row.doctor?.user?.name || 'Unknown'}`,
    },
    {
      key: 'diagnosis',
      header: 'Diagnosis',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.diagnosis}</div>
          <div className="table-cell-sub">
            {row.prescriptions?.length || 0} prescribed medication(s)
          </div>
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
            onClick={() => setSelectedRecord(row)}
          >
            <Eye size={14} />
            View
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setDeleteTarget(row)}
            title="Delete authorized record"
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
          <h1>Medical Records</h1>
          <p>Inspect clinical diagnoses, vitals, and authorized prescriptions across patients.</p>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search diagnosis, patient, or doctor..."
          />
          <div className="toolbar-filters">
            <select
              className="form-control form-control--inline"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              aria-label="Filter by patient"
            >
              <option value="">All Patients</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.user?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          emptyTitle="No medical records found"
          emptyMessage="Clinical records created by physicians will appear here."
        />
      </div>

      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Clinical Record & Prescriptions"
        size="lg"
      >
        {selectedRecord && (
          <div className="dashboard-stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Patient</span>
                <span className="detail-value">{selectedRecord.patient?.user?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Physician</span>
                <span className="detail-value">Dr. {selectedRecord.doctor?.user?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Visit Date</span>
                <span className="detail-value tabular-nums">{formatDate(selectedRecord.visitDate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Follow-Up Date</span>
                <span className="detail-value tabular-nums">{selectedRecord.followUpDate || '—'}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Diagnosis</span>
                <span className="detail-value">{selectedRecord.diagnosis}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Symptoms</span>
                <span className="detail-value">{selectedRecord.symptoms || '—'}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Clinical Notes</span>
                <span className="detail-value">{selectedRecord.clinicalNotes || '—'}</span>
              </div>
            </div>

            {selectedRecord.vitals && (
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Blood Pressure</span>
                  <span className="detail-value mono-text">{selectedRecord.vitals.bloodPressure || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Heart Rate</span>
                  <span className="detail-value mono-text">{selectedRecord.vitals.heartRate || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Temperature</span>
                  <span className="detail-value mono-text">{selectedRecord.vitals.temperature || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Weight</span>
                  <span className="detail-value mono-text">{selectedRecord.vitals.weight || '—'}</span>
                </div>
              </div>
            )}

            <div>
              <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Prescriptions</h4>
              {selectedRecord.prescriptions?.length ? (
                <div className="dashboard-stack" style={{ gap: '8px' }}>
                  {selectedRecord.prescriptions.map((rx, idx) => (
                    <div key={`${rx.medicineName}-${idx}`} className="prescription-card">
                      <strong>{rx.medicineName}</strong>
                      <div className="meta-line">
                        <span>Dosage: {rx.dosage}</span>
                        <span aria-hidden="true">·</span>
                        <span>Frequency: {rx.frequency}</span>
                        <span aria-hidden="true">·</span>
                        <span>Duration: {rx.duration}</span>
                      </div>
                      {rx.instructions && (
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {rx.instructions}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No prescriptions listed.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={submitting}
        title="Delete Medical Record"
        confirmLabel="Delete"
        message="Are you sure you want to delete this medical record? This action cannot be undone."
      />
    </div>
  );
}
