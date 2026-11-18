import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';

const TITLE_MAP = {
  '/admin': 'Overview',
  '/admin/patients': 'Patients',
  '/admin/doctors': 'Doctors',
  '/admin/appointments': 'Appointments',
  '/admin/medical-records': 'Medical Records',
  '/admin/billing': 'Billing & Invoices',
  '/admin/notifications': 'Notifications',
  '/admin/profile': 'Profile',
  '/doctor': 'Overview',
  '/doctor/appointments': 'My Appointments',
  '/doctor/patients': 'My Patients',
  '/doctor/medical-records': 'Medical Records',
  '/doctor/prescriptions': 'Prescriptions',
  '/doctor/notifications': 'Notifications',
  '/doctor/profile': 'My Profile',
  '/patient': 'Overview',
  '/patient/book-appointment': 'Book Appointment',
  '/patient/appointments': 'My Appointments',
  '/patient/medical-records': 'Medical Records',
  '/patient/prescriptions': 'Prescriptions',
  '/patient/billing': 'Billing',
  '/patient/notifications': 'Notifications',
  '/patient/profile': 'My Profile',
};

export default function DashboardLayout() {
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
      navigate('/login');
    } catch {
      showToast('Unable to sign out.', 'error');
    }
  };

  const sectionTitle = TITLE_MAP[location.pathname] || 'Dashboard';

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        unreadCount={unreadCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="app-main">
        <Navbar
          user={user}
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
