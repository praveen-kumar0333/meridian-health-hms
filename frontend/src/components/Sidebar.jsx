import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  BedDouble,
  Bell,
  Calendar,
  CalendarPlus,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Pill,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';

const NAV_BY_ROLE = {
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/emergency', label: 'Emergency Requests', icon: AlertTriangle },
    { to: '/admin/beds', label: 'Bed Management', icon: BedDouble },
    { to: '/admin/doctors', label: 'Manage Doctors', icon: Stethoscope },
    { to: '/admin/patients', label: 'Manage Patients', icon: Users },
    { to: '/admin/appointments', label: 'Manage Appointments', icon: Calendar },
    { to: '/admin/medical-records', label: 'Medical Records', icon: FileText },
    { to: '/admin/billing', label: 'Billing', icon: CreditCard },
    { to: '/admin/revenue', label: 'Revenue Analytics', icon: BarChart3 },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell, showUnread: true },
    { to: '/admin/profile', label: 'Admin Profile', icon: UserCheck },
  ],
  doctor: [
    { to: '/doctor', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/doctor/appointments', label: 'My Appointments', icon: Calendar },
    { to: '/doctor/patients', label: 'My Patients', icon: Users },
    { to: '/doctor/messages', label: 'Messages', icon: MessageSquare, showUnreadMessages: true },
    { to: '/doctor/medical-records', label: 'Medical Records', icon: FileText },
    { to: '/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
    { to: '/doctor/availability', label: 'Availability', icon: Clock },
    { to: '/doctor/notifications', label: 'Notifications', icon: Bell, showUnread: true },
    { to: '/doctor/profile', label: 'Doctor Profile', icon: UserCheck },
  ],
  patient: [
    { to: '/patient', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/patient/emergency', label: 'Emergency Help', icon: AlertTriangle },
    { to: '/patient/book-appointment', label: 'Book Appointment', icon: CalendarPlus },
    { to: '/patient/appointments', label: 'My Appointments', icon: Calendar },
    { to: '/patient/messages', label: 'Messages', icon: MessageSquare, showUnreadMessages: true },
    { to: '/patient/medical-records', label: 'My Medical Records', icon: FileText },
    { to: '/patient/prescriptions', label: 'My Prescriptions', icon: Pill },
    { to: '/patient/billing', label: 'My Billing', icon: CreditCard },
    { to: '/patient/notifications', label: 'Notifications', icon: Bell, showUnread: true },
    { to: '/patient/profile', label: 'Patient Profile', icon: UserCheck },
  ],
};

const ROLE_LABELS = {
  admin: 'Admin Portal',
  doctor: 'Doctor Portal',
  patient: 'Patient Portal',
};

function getInitials(name) {
  if (!name) return 'MH';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export default function Sidebar({
  user,
  portalRole,
  unreadCount = 0,
  unreadMessagesCount = 0,
  isOpen,
  onClose,
  onLogout,
}) {
  const activeRole = portalRole || user?.role || 'patient';
  const navItems = NAV_BY_ROLE[activeRole] || [];

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`sidebar sidebar--${activeRole} ${isOpen ? 'is-open' : ''}`}
        aria-label="Primary navigation"
      >
        <div className="sidebar-brand">
          <BrandLogo size="sm" showSubtitle />
          <button
            type="button"
            className="btn btn-ghost btn-sm sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-role-caption">
          <span className={`role-portal-label role-portal-label--${activeRole}`}>
            {ROLE_LABELS[activeRole] || 'Hospital Portal'}
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={Boolean(item.end)}
                onClick={onClose}
                className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.showUnread && unreadCount > 0 && (
                  <span className="sidebar-link-count">{unreadCount}</span>
                )}
                {item.showUnreadMessages && unreadMessagesCount > 0 && (
                  <span className="sidebar-link-count">{unreadMessagesCount}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-summary">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {getInitials(user?.name)}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-meta">{user?.email}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
            onClick={onLogout}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
