import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarClock, Check, Clock, Users, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDate, formatDateTime, getErrorMessage } from '../../utils/formatters.js';

export default function DoctorOverview() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/doctor');
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load doctor dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      showToast(`Appointment updated to ${status}.`);
      loadDashboard();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  if (loading) return <LoadingSpinner label="Loading clinical schedule..." />;
  if (error) return <div className="alert-banner alert-banner--error">{error}</div>;

  const stats = data?.stats || {};
  const todaysAppointments = data?.todaysAppointments || [];
  const upcomingAppointments = data?.upcomingAppointments || [];
  const recentActivities = data?.recentActivities || [];

  const todayColumns = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div>
          <div className="table-cell-primary">{row.patient?.user?.name || 'Unknown'}</div>
          <div className="table-cell-sub">{row.reason}</div>
        </div>
      ),
    },
    {
      key: 'slot',
      header: 'Slot',
      tabular: true,
      render: (row) => `${row.startTime} – ${row.endTime}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions">
          {row.status === 'Pending' && (
            <>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => handleStatusUpdate(row._id, 'Approved')}
              >
                <Check size={14} />
                Accept
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleStatusUpdate(row._id, 'Rejected')}
              >
                <XCircle size={14} />
                Reject
              </button>
            </>
          )}
          {row.status === 'Approved' && (
            <button
              type="button"
              className="btn btn-teal btn-sm"
              onClick={() => handleStatusUpdate(row._id, 'Completed')}
            >
              Complete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Physician Dashboard</h1>
          <p>Today&apos;s consultation schedule, pending requests, and assigned patients.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/doctor/medical-records" className="btn btn-primary">
            Write Clinical Record
          </Link>
        </div>
      </div>

      <div className="context-strip">
        <div className="context-strip-main">
          <span className="context-strip-title">
            Dr. {user?.name || 'Physician'}
          </span>
          <div className="meta-line">
            <span>{user?.profile?.department || 'Clinical Medicine'}</span>
            <span aria-hidden="true">·</span>
            <span>{user?.profile?.specialization || 'Attending Specialist'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Shift {user?.profile?.workingHours?.start || '09:00'} – {user?.profile?.workingHours?.end || '17:00'}
            </span>
          </div>
        </div>
        <div className="context-strip-actions">
          <Link to="/doctor/messages" className="btn btn-secondary btn-sm">
            Messages
          </Link>
          <Link to="/doctor/availability" className="btn btn-secondary btn-sm">
            Manage Availability
          </Link>
          <Link to="/doctor/prescriptions" className="btn btn-secondary btn-sm">
            Prescriptions
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <DashboardCard
          label="Today's Appointments"
          value={stats.todaysCount ?? 0}
          hint="Scheduled for today"
          icon={CalendarClock}
        />
        <DashboardCard
          label="Upcoming Appointments"
          value={stats.upcomingCount ?? 0}
          hint="Future scheduled visits"
          icon={Calendar}
          tone="teal"
        />
        <DashboardCard
          label="Assigned Patients"
          value={stats.assignedPatients ?? 0}
          hint="Authorized under your care"
          icon={Users}
        />
        <DashboardCard
          label="Pending Requests"
          value={stats.pendingRequests ?? 0}
          hint="Awaiting your acceptance"
          icon={Clock}
          tone="teal"
        />
      </div>

      <div className="dashboard-split">
        <div className="dashboard-stack">
          <section className="surface-card">
            <div className="surface-header">
              <h2>Today&apos;s Consultations</h2>
              <Link to="/doctor/appointments" className="btn btn-secondary btn-sm">
                Full Schedule
              </Link>
            </div>
            <DataTable
              columns={todayColumns}
              data={todaysAppointments}
              emptyTitle="No consultations today"
              emptyMessage="You have no appointments scheduled for today."
            />
          </section>

          <section className="surface-card">
            <div className="surface-header">
              <h2>Upcoming Appointments</h2>
            </div>
            {upcomingAppointments.length === 0 ? (
              <EmptyState
                title="No upcoming visits"
                message="Future approved and pending appointments will appear here."
              />
            ) : (
              <div className="feed-list">
                {upcomingAppointments.map((appt) => (
                  <div key={appt._id} className="feed-item">
                    <div className="feed-item-body">
                      <div className="feed-item-title">{appt.patient?.user?.name}</div>
                      <p className="feed-item-text">{appt.reason}</p>
                      <div className="meta-line">
                        <span className="tabular-nums">{formatDate(appt.appointmentDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {appt.startTime} – {appt.endTime}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="surface-card">
          <div className="surface-header">
            <h2>Recent Activities</h2>
            <Link to="/doctor/notifications" className="btn btn-secondary btn-sm">
              Inbox
            </Link>
          </div>
          {recentActivities.length === 0 ? (
            <EmptyState
              title="No recent notifications"
              message="Appointment requests and hospital notices will appear here."
            />
          ) : (
            <div className="feed-list">
              {recentActivities.map((item) => (
                <div key={item._id} className="feed-item">
                  <div className="feed-item-body">
                    <div className="feed-item-title">{item.title}</div>
                    <p className="feed-item-text">{item.message}</p>
                    <div className="meta-line">
                      <span className="tabular-nums">{formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
