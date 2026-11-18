import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import NotificationPanel from '../../components/NotificationPanel.jsx';
import { getErrorMessage } from '../../utils/formatters.js';

export default function NotificationsPage() {
  const { showToast } = useToast();
  const { refreshUnreadCount } = useOutletContext() || {};
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
      if (refreshUnreadCount) refreshUnreadCount();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load notifications.'));
    } finally {
      setLoading(false);
    }
  }, [refreshUnreadCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      showToast('Notification marked as read.');
      loadNotifications();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      showToast('All notifications marked as read.');
      loadNotifications();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay informed on appointment updates, medical records, and billing alerts.</p>
        </div>
        {unreadCount > 0 && (
          <div className="page-header-actions">
            <button type="button" className="btn btn-secondary" onClick={handleMarkAllRead}>
              <CheckCheck size={16} />
              Mark All Read ({unreadCount})
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert-banner alert-banner--error">{error}</div>}

      <div className="surface-card">
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          onMarkRead={handleMarkRead}
        />
      </div>
    </div>
  );
}
