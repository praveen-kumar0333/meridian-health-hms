import { useState, useEffect, useCallback } from 'react';
import { Eye, FileText } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDate, getErrorMessage } from '../../utils/formatters.js';

export default function DoctorPatients() {
  const { showToast } = useToast();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients', { params: { search } });
      setPatients(res.data?.patients || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load assigned patients.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const openPatientHistory = async (patient) => {
    setSelectedPatient(patient);
    setLoadingHistory(true);
    try {
      const res = await api.get('/medical-records', {
        params: { patientId: patient._id },
      });
      setHistoryRecords(res.data?.records || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load medical history.'), 'error');
      setHistoryRecords([]);
    } finally {
      setLoadingHistory(false);
    }
  };

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
      header: 'Gender / Blood Group',
      render: (row) => `${row.gender} · ${row.bloodGroup}`,
    },
    {
      key: 'allergies',
      header: 'Known Allergies',
      render: (row) => (row.allergies?.length ? row.allergies.join(', ') : 'None recorded'),
    },
    {
      key: 'phone',
      header: 'Phone',
      tabular: true,
      render: (row) => row.user?.phone || '—',
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
            onClick={() => openPatientHistory(row)}
          >
            <Eye size={14} />
            Info & History
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Patients</h1>
          <p>View authorized patients assigned to your care and review their medical history.</p>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search assigned patients..."
          />
        </div>

        <DataTable
          columns={columns}
          data={patients}
          loading={loading}
          emptyTitle="No assigned patients"
          emptyMessage="Patients assigned to you or booked for consultations will appear here."
        />
      </div>

      <Modal
        isOpen={Boolean(selectedPatient)}
        onClose={() => setSelectedPatient(null)}
        title={`Patient File — ${selectedPatient?.user?.name || ''}`}
        size="lg"
      >
        {selectedPatient && (
          <div className="dashboard-stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Patient Code</span>
                <span className="detail-value mono-text">{selectedPatient.patientCode || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date of Birth</span>
                <span className="detail-value tabular-nums">{formatDate(selectedPatient.dateOfBirth)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Gender / Blood Group</span>
                <span className="detail-value">
                  {selectedPatient.gender} · {selectedPatient.bloodGroup}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact</span>
                <span className="detail-value">{selectedPatient.user?.phone || selectedPatient.user?.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Allergies</span>
                <span className="detail-value">
                  {selectedPatient.allergies?.length ? selectedPatient.allergies.join(', ') : 'None'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Chronic Conditions</span>
                <span className="detail-value">
                  {selectedPatient.chronicConditions?.length
                    ? selectedPatient.chronicConditions.join(', ')
                    : 'None'}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '16px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>Medical History</h4>
              {loadingHistory ? (
                <LoadingSpinner label="Loading clinical history..." />
              ) : historyRecords.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No medical history yet"
                  message="No clinical notes or diagnoses have been recorded for this patient yet."
                />
              ) : (
                <div className="dashboard-stack" style={{ gap: '10px' }}>
                  {historyRecords.map((rec) => (
                    <div key={rec._id} className="prescription-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <strong>{rec.diagnosis}</strong>
                        <span className="tabular-nums" style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                          {formatDate(rec.visitDate)}
                        </span>
                      </div>
                      {rec.clinicalNotes && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {rec.clinicalNotes}
                        </p>
                      )}
                      {rec.prescriptions?.length > 0 && (
                        <div className="meta-line" style={{ marginTop: '4px' }}>
                          <span>
                            Rx:{' '}
                            {rec.prescriptions
                              .map((rx) => `${rx.medicineName} (${rx.dosage}, ${rx.frequency})`)
                              .join('; ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
