import { Link } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';

export default function Navbar({
  user,
  portalRole,
  sectionTitle,
  unreadCount = 0,
  onOpenMenu,
  onLogout,
}) {
  const activeRole = portalRole || user?.role || 'patient';
  const notificationsPath = `/${activeRole}/notifications`;
  const roleLabel =
    activeRole === 'admin'
      ? 'Admin Dashboard'
      : activeRole === 'doctor'
      ? 'Doctor Dashboard'
      : 'Patient Dashboard';

  return (
    <header className={`top-navbar top-navbar--${activeRole}`}>
      <div className="navbar-left">
        <button
          type="button"
          className="btn btn-secondary btn-sm navbar-menu-btn"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={17} />
        </button>
        <div className="navbar-breadcrumb">
          <span className={`navbar-role-label navbar-role-label--${activeRole}`}>
            {roleLabel}
          </span>
          <span aria-hidden="true">/</span>
          <strong>{sectionTitle}</strong>
        </div>
      </div>

      <div className="navbar-actions">
        <span className="navbar-tagline">Modern Healthcare. Connected Care.</span>
        <Link to={notificationsPath} className="btn btn-secondary btn-sm navbar-bell-btn">
          <Bell size={15} />
          <span>Alerts</span>
          {unreadCount > 0 && <span className="navbar-unread-num">{unreadCount}</span>}
        </Link>

        <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
