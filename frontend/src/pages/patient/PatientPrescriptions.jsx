import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { formatDate, getErrorMessage } from '../../utils/formatters.js';

export default function PatientPrescriptions() {
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
            medicineName: rx.medicineName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions,
            diagnosis: rec.diagnosis,
            doctorName: rec.doctor?.user?.name || 'Physician',
            visitDate: rec.visitDate,
          });
        });
      });

      const term = search.trim().toLowerCase();
      setRows(
        term
          ? flattened.filter(
              (r) =>
                r.medicineName.toLowerCase().includes(term) ||
                r.diagnosis.toLowerCase().includes(term) ||
                r.doctorName.toLowerCase().includes(term)
            )
          : flattened
      );
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
      key: 'duration',
      header: 'Duration',
      render: (row) => row.duration,
    },
    {
      key: 'diagnosis',
      header: 'Diagnosis',
      render: (row) => row.diagnosis,
    },
    {
      key: 'doctor',
      header: 'Prescribed By',
      render: (row) => `Dr. ${row.doctorName}`,
    },
    {
      key: 'visitDate',
      header: 'Date',
      tabular: true,
      render: (row) => formatDate(row.visitDate),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Prescriptions</h1>
          <p>View dosage schedules, durations, and prescribing physician details.</p>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search medication, diagnosis, or doctor..."
          />
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyTitle="No prescriptions yet"
          emptyMessage="Medications prescribed by your doctor will appear here."
        />
      </div>
    </div>
  );
}
