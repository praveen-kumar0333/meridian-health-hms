import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarClock, Stethoscope, Users } from 'lucide-react';
import api from '../../services/api.js';
import DashboardCard from '../../components/DashboardCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatCurrency, formatDateTime, getErrorMessage } from '../../utils/formatters.js';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/dashboard/admin');
        setData(res.data);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load hospital overview.'));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading hospital operations overview..." />;
  }

  if (error) {
    return <div className="alert-banner alert-banner--error">{error}</div>;
  }

  const stats = data?.stats || {};
  const recentAppointments = data?.recentAppointments || [];
  const recentActivities = data?.recentActivities || [];
  const departmentCounts = data?.departmentCounts || [];
  const statusCountsRaw = data?.appointmentStatusCounts || [];
  const maxDeptCount = Math.max(1, ...departmentCounts.map((d) => d.count));

  const statusMap = statusCountsRaw.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
  const totalForBars = Math.max(1, stats.totalAppointments || 0);
  const statusBreakdown = [
    { label: 'Completed', count: statusMap.Completed || 0, toneClass: 'dept-bar-fill--completed' },
    { label: 'Approved', count: statusMap.Approved || 0, toneClass: 'dept-bar-fill--approved' },
    { label: 'Pending', count: statusMap.Pending || 0, toneClass: 'dept-bar-fill--pending' },
    {
      label: 'Cancelled / Rejected',
      count: (statusMap.Cancelled || 0) + (statusMap.Rejected || 0),
      toneClass: 'dept-bar-fill--cancelled',
    },
  ];

  const columns = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.patient?.user?.name || 'Unknown'}</div>
          <div className="table-cell-sub">{row.department}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (row) => `Dr. ${row.doctor?.user?.name || 'Unassigned'}`,
    },
    {
      key: 'schedule',
      header: 'Date & Time',
      tabular: true,
      render: (row) => `${row.appointmentDate} · ${row.startTime}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Hospital Overview</h1>
          <p>Live operational metrics across patients, physicians, appointments, and billing.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/admin/emergency" className="btn btn-secondary">
            Emergency Desk
          </Link>
          <Link to="/admin/beds" className="btn btn-secondary">
            Bed Capacity
          </Link>
          <Link to="/admin/appointments" className="btn btn-primary">
            Manage Appointments
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <DashboardCard
          label="Total Patients"
          value={stats.totalPatients ?? 0}
          hint="Active registered patient profiles"
          icon={Users}
        />
        <DashboardCard
          label="Total Doctors"
          value={stats.totalDoctors ?? 0}
          hint={`${stats.activeDoctors ?? 0} currently active`}
          icon={Stethoscope}
          tone="teal"
        />
        <DashboardCard
          label="Total Appointments"
          value={stats.totalAppointments ?? 0}
          hint={`${stats.pendingAppointments ?? 0} awaiting review`}
          icon={Calendar}
        />
        <DashboardCard
          label="Today's Appointments"
          value={stats.todaysAppointments ?? 0}
          hint="Scheduled for today"
          icon={CalendarClock}
          tone="teal"
        />
      </div>

      <div className="dashboard-split">
        <div className="dashboard-stack">
          <section className="surface-card">
            <div className="surface-header">
              <h2>Recent Appointments</h2>
              <Link to="/admin/appointments" className="btn btn-secondary btn-sm">
                View All
              </Link>
            </div>
            <DataTable
              columns={columns}
              data={recentAppointments}
              emptyTitle="No appointments yet"
              emptyMessage="Booked appointments will appear here once scheduled."
            />
          </section>

          <section className="surface-card">
            <div className="surface-header">
              <h2>Billing Snapshot</h2>
              <div className="table-actions">
                <Link to="/admin/revenue" className="btn btn-secondary btn-sm">
                  Revenue Analytics
                </Link>
                <Link to="/admin/billing" className="btn btn-secondary btn-sm">
                  Open Billing
                </Link>
              </div>
            </div>
            <div className="surface-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Collected Revenue</span>
                  <span className="detail-value tabular-nums" style={{ fontSize: '20px', color: 'var(--status-success)' }}>
                    {formatCurrency(stats.paidRevenue)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pending / Overdue Balance</span>
                  <span className="detail-value tabular-nums" style={{ fontSize: '20px', color: 'var(--status-warning)' }}>
                    {formatCurrency(stats.pendingRevenue)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="surface-card">
            <div className="surface-header">
              <h2>Appointment Status Breakdown</h2>
              <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="surface-body">
              {stats.totalAppointments === 0 ? (
                <EmptyState
                  title="No appointments recorded"
                  message="Status distribution will display once appointments are scheduled."
                />
              ) : (
                <div className="dept-bar-list">
                  {statusBreakdown.map((item) => {
                    const pct = Math.round((item.count / totalForBars) * 100);
                    return (
                      <div key={item.label} className="dept-bar-row">
                        <div className="dept-bar-meta">
                          <span>{item.label}</span>
                          <strong className="tabular-nums">
                            {item.count} ({pct}%)
                          </strong>
                        </div>
                        <div className="dept-bar-track">
                          <div
                            className={`dept-bar-fill ${item.toneClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="surface-card">
            <div className="surface-header">
              <h2>Active Doctors by Department</h2>
              <Stethoscope size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="surface-body">
              {departmentCounts.length === 0 ? (
                <EmptyState
                  title="No active departments"
                  message="Add active doctors to view department distribution."
                />
              ) : (
                <div className="dept-bar-list">
                  {departmentCounts.map((dept) => (
                    <div key={dept._id} className="dept-bar-row">
                      <div className="dept-bar-meta">
                        <span>{dept._id}</span>
                        <strong className="tabular-nums">{dept.count}</strong>
                      </div>
                      <div className="dept-bar-track">
                        <div
                          className="dept-bar-fill"
                          style={{ width: `${Math.round((dept.count / maxDeptCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="surface-card">
            <div className="surface-header">
              <h2>Recent Hospital Activities</h2>
              <Link to="/admin/notifications" className="btn btn-secondary btn-sm">
                All Logs
              </Link>
            </div>
            {recentActivities.length === 0 ? (
              <EmptyState
                title="No recent activity"
                message="System notifications and updates will show here."
              />
            ) : (
              <div className="feed-list">
                {recentActivities.map((act) => (
                  <div key={act._id} className="feed-item">
                    <div className="feed-item-body">
                      <div className="feed-item-title">{act.title}</div>
                      <p className="feed-item-text">{act.message}</p>
                      <div className="meta-line">
                        <span>{act.recipient?.name || 'System'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateTime(act.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
