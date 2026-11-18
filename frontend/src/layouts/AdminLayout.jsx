import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';

const ADMIN_TITLES = {
  '/admin': 'Overview',
  '/admin/emergency': 'Emergency Management',
  '/admin/beds': 'Bed Availability Management',
  '/admin/doctors': 'Manage Doctors',
  '/admin/patients': 'Manage Patients',
  '/admin/appointments': 'Manage Appointments',
  '/admin/medical-records': 'Medical Records',
  '/admin/billing': 'Billing & Invoices',
  '/admin/revenue': 'Revenue Analytics',
  '/admin/notifications': 'Notifications',
  '/admin/profile': 'Admin Profile',
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      // ignore background count error
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, location.pathname]);

  const outletContext = useMemo(
    () => ({ refreshUnreadCount: fetchUnreadCount }),
    [fetchUnreadCount]
  );

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Signed out successfully.');
      navigate('/login', { replace: true });
    } catch {
      showToast('Unable to sign out.', 'error');
    }
  };

  const sectionTitle = ADMIN_TITLES[location.pathname] || 'Admin Dashboard';

  return (
    <div className="app-shell app-shell--admin">
      <Sidebar
        user={user}
        portalRole="admin"
        unreadCount={unreadCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="app-main">
        <Navbar
          user={user}
          portalRole="admin"
          sectionTitle={sectionTitle}
          unreadCount={unreadCount}
          onOpenMenu={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <main className="page-viewport">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
