import { useState, useEffect, useCallback } from 'react';
import { Eye } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import Modal from '../../components/Modal.jsx';
import { formatDate, getErrorMessage } from '../../utils/formatters.js';

export default function PatientMedicalRecords() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/medical-records', { params: { search } });
      setRecords(res.data?.records || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load medical history.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const columns = [
    {
      key: 'diagnosis',
      header: 'Diagnosis',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.diagnosis}</div>
          <div className="table-cell-sub">{row.symptoms || 'No symptoms recorded'}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Attending Doctor',
      render: (row) => `Dr. ${row.doctor?.user?.name || 'Physician'}`,
    },
    {
      key: 'prescriptions',
      header: 'Medications',
      tabular: true,
      render: (row) => `${row.prescriptions?.length || 0} prescribed`,
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
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setSelected(row)}
        >
          <Eye size={14} />
          Details
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Medical Records</h1>
          <p>Review your personal diagnoses, vitals, clinical notes, and follow-up plans.</p>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search diagnosis or doctor..."
          />
        </div>

        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          emptyTitle="No medical records yet"
          emptyMessage="Clinical records from your consultations will appear here."
        />
      </div>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Visit Medical Summary"
        size="lg"
      >
        {selected && (
          <div className="dashboard-stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Doctor</span>
                <span className="detail-value">Dr. {selected.doctor?.user?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Visit Date</span>
                <span className="detail-value tabular-nums">{formatDate(selected.visitDate)}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Diagnosis</span>
                <span className="detail-value">{selected.diagnosis}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Clinical Notes</span>
                <span className="detail-value">{selected.clinicalNotes || '—'}</span>
              </div>
            </div>

            {selected.vitals && (
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Blood Pressure</span>
                  <span className="detail-value mono-text">{selected.vitals.bloodPressure || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Heart Rate</span>
                  <span className="detail-value mono-text">{selected.vitals.heartRate || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Temperature</span>
                  <span className="detail-value mono-text">{selected.vitals.temperature || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Follow-up Date</span>
                  <span className="detail-value tabular-nums">{selected.followUpDate || '—'}</span>
                </div>
              </div>
            )}

            {selected.prescriptions?.length > 0 && (
              <div className="dashboard-stack" style={{ gap: '8px' }}>
                <h4 style={{ fontSize: '14px' }}>Prescribed Medications</h4>
                {selected.prescriptions.map((rx, idx) => (
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
