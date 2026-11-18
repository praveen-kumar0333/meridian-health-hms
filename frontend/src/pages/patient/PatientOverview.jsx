import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, Calendar, CalendarPlus, CreditCard, FileText, MessageSquare } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from '../../utils/formatters.js';

export default function PatientOverview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/dashboard/patient');
        setData(res.data);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load your patient portal.'));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) return <LoadingSpinner label="Loading your health dashboard..." />;
  if (error) return <div className="alert-banner alert-banner--error">{error}</div>;

  const stats = data?.stats || {};
  const upcomingAppointments = data?.upcomingAppointments || [];
  const previousAppointments = data?.previousAppointments || [];
  const recentRecords = data?.recentRecords || [];
  const notifications = data?.notifications || [];

  const recentPrescriptions = [];
  recentRecords.forEach((rec) => {
    (rec.prescriptions || []).forEach((rx) => {
      recentPrescriptions.push({
        ...rx,
        doctorName: rec.doctor?.user?.name || 'Physician',
        visitDate: rec.visitDate,
      });
    });
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Patient Dashboard</h1>
          <p>Review your upcoming visits, recent prescriptions, billing balance, and alerts.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/patient/emergency" className="btn btn-danger">
            <AlertTriangle size={16} />
            Emergency Assistance
          </Link>
          <Link to="/patient/book-appointment" className="btn btn-primary">
            <CalendarPlus size={16} />
            Book Appointment
          </Link>
        </div>
      </div>

      <div className="emergency-callout" role="region" aria-label="Emergency assistance">
        <div className="emergency-callout-body">
          <div className="emergency-callout-icon" aria-hidden="true">
            <AlertTriangle size={19} />
          </div>
          <div>
            <div className="emergency-callout-title">Need Urgent Hospital Coordination?</div>
            <p className="emergency-callout-text">
              Submit an emergency assistance request to notify hospital coordinators and track bed
              or ambulance arrangements. Submitting a request does not automatically dispatch an
              ambulance — for life-threatening emergencies, call local emergency services
              immediately.
            </p>
          </div>
        </div>
        <Link to="/patient/emergency" className="btn btn-danger btn-sm">
          Request Emergency Help
        </Link>
      </div>

      <div className="context-strip">
        <div className="context-strip-main">
          <span className="context-strip-title">
            {user?.name || 'Patient'} · Care Summary
          </span>
          <div className="meta-line">
            <span>
              Patient ID:{' '}
              <strong className="mono-text">{user?.profile?.patientCode || 'Pending'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>Blood Group: {user?.profile?.bloodGroup || 'Unknown'}</span>
            {user?.profile?.assignedDoctor?.user?.name && (
              <>
                <span aria-hidden="true">·</span>
                <span>Assigned Doctor: Dr. {user.profile.assignedDoctor.user.name}</span>
              </>
            )}
          </div>
        </div>
        <div className="context-strip-actions">
          <Link to="/patient/messages" className="btn btn-secondary btn-sm">
            <MessageSquare size={14} />
            Message Doctor
          </Link>
          <Link to="/patient/medical-records" className="btn btn-secondary btn-sm">
            Medical Records
          </Link>
          <Link to="/patient/billing" className="btn btn-secondary btn-sm">
            My Billing
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <DashboardCard
          label="Upcoming Appointments"
          value={stats.upcomingCount ?? 0}
          hint={`${stats.previousCount ?? 0} previous visits`}
          icon={Calendar}
        />
        <DashboardCard
          label="Medical Records"
          value={stats.recordsCount ?? 0}
          hint="Recent diagnoses & notes"
          icon={FileText}
          tone="teal"
        />
        <DashboardCard
          label="Outstanding Balance"
          value={formatCurrency(stats.outstandingBalance)}
          hint="Pending or overdue invoices"
          icon={CreditCard}
        />
        <DashboardCard
          label="Unread Alerts"
          value={stats.unreadNotifications ?? 0}
          hint="Appointment & clinic updates"
          icon={Bell}
          tone="teal"
        />
      </div>

      <div className="dashboard-split">
        <div className="dashboard-stack">
          <section className="surface-card">
            <div className="surface-header">
              <h2>Upcoming Appointments</h2>
              <Link to="/patient/appointments" className="btn btn-secondary btn-sm">
                View All
              </Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <EmptyState
                title="No upcoming appointments"
                message="Book a consultation with one of our clinical specialists."
                action={
                  <Link to="/patient/book-appointment" className="btn btn-primary btn-sm">
                    Book Appointment
                  </Link>
                }
              />
            ) : (
              <div className="feed-list">
                {upcomingAppointments.map((appt) => (
                  <div key={appt._id} className="feed-item">
                    <div className="feed-item-body">
                      <div className="feed-item-title">
                        Dr. {appt.doctor?.user?.name || 'Assigned Doctor'}
                      </div>
                      <p className="feed-item-text">{appt.reason}</p>
                      <div className="meta-line">
                        <span>{appt.department}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{appt.appointmentDate}</span>
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

          <section className="surface-card">
            <div className="surface-header">
              <h2>Previous Appointments</h2>
            </div>
            {previousAppointments.length === 0 ? (
              <EmptyState
                title="No previous appointments"
                message="Completed or past visits will appear here."
              />
            ) : (
              <div className="feed-list">
                {previousAppointments.map((appt) => (
                  <div key={appt._id} className="feed-item">
                    <div className="feed-item-body">
                      <div className="feed-item-title">
                        Dr. {appt.doctor?.user?.name || 'Physician'}
                      </div>
                      <div className="meta-line">
                        <span>{appt.department}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{appt.appointmentDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{appt.startTime}</span>
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="surface-card">
            <div className="surface-header">
              <h2>Recent Prescriptions</h2>
              <Link to="/patient/prescriptions" className="btn btn-secondary btn-sm">
                View All
              </Link>
            </div>
            {recentPrescriptions.length === 0 ? (
              <EmptyState
                title="No prescriptions yet"
                message="Medications prescribed during consultations will appear here."
              />
            ) : (
              <div className="surface-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentPrescriptions.slice(0, 4).map((rx, idx) => (
                  <div key={idx} className="prescription-card">
                    <strong>{rx.medicineName}</strong>
                    <div className="meta-line">
                      <span>{rx.dosage}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rx.frequency}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rx.duration}</span>
                    </div>
                    {rx.instructions && (
                      <p className="prescription-instructions">{rx.instructions}</p>
                    )}
                    <div className="meta-line">
                      <span>Dr. {rx.doctorName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatDate(rx.visitDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card">
            <div className="surface-header">
              <h2>Notifications</h2>
              <Link to="/patient/notifications" className="btn btn-secondary btn-sm">
                View All
              </Link>
            </div>
            {notifications.length === 0 ? (
              <EmptyState
                title="No notifications"
                message="Appointment and billing notifications will show here."
              />
            ) : (
              <div className="feed-list">
                {notifications.map((n) => (
                  <div key={n._id} className={`feed-item ${!n.isRead ? 'is-unread' : ''}`}>
                    <div className="feed-item-body">
                      <div className="feed-item-title">{n.title}</div>
                      <p className="feed-item-text">{n.message}</p>
                      <div className="meta-line">
                        <span className="tabular-nums">{formatDateTime(n.createdAt)}</span>
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
