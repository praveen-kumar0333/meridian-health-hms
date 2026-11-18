import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { formatDate, getErrorMessage } from '../../utils/formatters.js';

export default function DoctorPrescriptions() {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/medical-records');
      const records = res.data?.records || [];
      const flattened = [];

      records.forEach((rec) => {
        (rec.prescriptions || []).forEach((rx, idx) => {
          flattened.push({
            _id: `${rec._id}-${idx}`,
            patientName: rec.patient?.user?.name || 'Unknown',
            diagnosis: rec.diagnosis,
            visitDate: rec.visitDate,
            medicineName: rx.medicineName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions,
          });
        });
      });

      const term = search.trim().toLowerCase();
      const filtered = term
        ? flattened.filter(
            (r) =>
              r.patientName.toLowerCase().includes(term) ||
              r.medicineName.toLowerCase().includes(term) ||
              r.diagnosis.toLowerCase().includes(term)
          )
        : flattened;

      setRows(filtered);
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load prescriptions.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const columns = [
    {
      key: 'medicine',
      header: 'Medication',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.medicineName}</div>
          <div className="table-cell-sub">{row.dosage} · {row.frequency}</div>
          {row.instructions && <div className="table-cell-sub">{row.instructions}</div>}
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Diagnosis',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.patientName}</div>
          <div className="table-cell-sub">{row.diagnosis}</div>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => row.duration,
    },
    {
      key: 'visitDate',
      header: 'Prescribed Date',
      tabular: true,
      render: (row) => formatDate(row.visitDate),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Prescriptions</h1>
          <p>Review active and historical medication orders issued to your patients.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/doctor/medical-records" className="btn btn-primary">
            <Plus size={16} />
            Create Prescription
          </Link>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search medication, patient, or diagnosis..."
          />
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyTitle="No prescriptions issued"
          emptyMessage="Create a medical record with prescription entries to see them listed here."
        />
      </div>
    </div>
  );
}
