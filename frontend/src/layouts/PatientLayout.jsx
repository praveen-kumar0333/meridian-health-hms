import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';

const PATIENT_TITLES = {
  '/patient': 'Overview',
  '/patient/emergency': 'Emergency Assistance',
  '/patient/book-appointment': 'Book Appointment',
  '/patient/appointments': 'My Appointments',
  '/patient/messages': 'Messages',
  '/patient/medical-records': 'My Medical Records',
  '/patient/prescriptions': 'My Prescriptions',
  '/patient/billing': 'My Billing',
  '/patient/notifications': 'Notifications',
  '/patient/profile': 'Patient Profile',
};

export default function PatientLayout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      // ignore background count error
    }
  }, []);

  const fetchChatUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/chat/unread-count');
      setUnreadMessagesCount(res.data?.unreadCount || 0);
    } catch {
      // ignore background count error
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchChatUnreadCount();
  }, [fetchUnreadCount, fetchChatUnreadCount, location.pathname]);

  const outletContext = useMemo(
    () => ({
      refreshUnreadCount: fetchUnreadCount,
      refreshChatUnreadCount: fetchChatUnreadCount,
    }),
    [fetchUnreadCount, fetchChatUnreadCount]
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

  const sectionTitle = PATIENT_TITLES[location.pathname] || 'Patient Portal';

  return (
    <div className="app-shell app-shell--patient">
      <Sidebar
        user={user}
        portalRole="patient"
        unreadCount={unreadCount}
        unreadMessagesCount={unreadMessagesCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="app-main">
        <Navbar
          user={user}
          portalRole="patient"
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
