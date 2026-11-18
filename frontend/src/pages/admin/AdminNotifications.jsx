import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCheck, Send } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import NotificationPanel from '../../components/NotificationPanel.jsx';
import Modal from '../../components/Modal.jsx';
import FormInput from '../../components/FormInput.jsx';
import { getErrorMessage } from '../../utils/formatters.js';

export default function AdminNotifications() {
  const { showToast } = useToast();
  const { refreshUnreadCount } = useOutletContext() || {};
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [scope, setScope] = useState('personal');
  const [loading, setLoading] = useState(true);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    mode: 'group',
    targetRole: 'doctor',
    recipientId: '',
    type: 'general',
    title: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifRes, usersRes] = await Promise.all([
        api.get('/notifications', { params: { scope } }),
        api.get('/auth/users'),
      ]);
      setNotifications(notifRes.data?.notifications || []);
      setUnreadCount(notifRes.data?.unreadCount || 0);
      setUsers(usersRes.data?.users || []);
      if (refreshUnreadCount) refreshUnreadCount();
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to load notifications.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [scope, refreshUnreadCount, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      showToast('Notification marked as read.');
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      showToast('All personal notifications marked as read.');
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: sendForm.title,
        message: sendForm.message,
        type: sendForm.type,
      };
      if (sendForm.mode === 'individual') {
        payload.recipientId = sendForm.recipientId;
      } else {
        payload.targetRole = sendForm.targetRole;
      }

      const res = await api.post('/notifications', payload);
      showToast(res.data?.message || 'Notification sent.');
      setSendOpen(false);
      setSendForm({
        mode: 'group',
        targetRole: 'doctor',
        recipientId: '',
        type: 'general',
        title: '',
        message: '',
      });
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Hospital Notifications</h1>
          <p>Review alerts and send updates to physicians, patients, or specific users.</p>
        </div>
        <div className="page-header-actions">
          {unreadCount > 0 && (
            <button type="button" className="btn btn-secondary" onClick={handleMarkAll}>
              <CheckCheck size={16} />
              Mark Read ({unreadCount})
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setSendOpen(true)}>
            <Send size={16} />
            Send Notification
          </button>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-toolbar">
          <div className="segmented-tabs">
            <button
              type="button"
              className={`segmented-tab ${scope === 'personal' ? 'is-active' : ''}`}
              onClick={() => setScope('personal')}
            >
              My Inbox
            </button>
            <button
              type="button"
              className={`segmented-tab ${scope === 'all' ? 'is-active' : ''}`}
              onClick={() => setScope('all')}
            >
              Hospital Activity Log
            </button>
          </div>
        </div>

        <NotificationPanel
          notifications={notifications}
          loading={loading}
          onMarkRead={handleMarkRead}
          showRecipient={scope === 'all'}
        />
      </div>

      <Modal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send Hospital Notification"
      >
        <form onSubmit={handleSend}>
          <div className="form-grid">
            <FormInput
              label="Delivery Scope"
              name="mode"
              type="select"
              value={sendForm.mode}
              onChange={(e) => setSendForm({ ...sendForm, mode: e.target.value })}
              options={[
                { value: 'group', label: 'Role Broadcast' },
                { value: 'individual', label: 'Specific User' },
              ]}
            />
            {sendForm.mode === 'group' ? (
              <FormInput
                label="Target Group"
                name="targetRole"
                type="select"
                value={sendForm.targetRole}
                onChange={(e) => setSendForm({ ...sendForm, targetRole: e.target.value })}
                options={[
                  { value: 'doctor', label: 'All Active Doctors' },
                  { value: 'patient', label: 'All Active Patients' },
                  { value: 'all', label: 'All Hospital Users' },
                ]}
              />
            ) : (
              <FormInput
                label="Recipient"
                name="recipientId"
                type="select"
                value={sendForm.recipientId}
                onChange={(e) => setSendForm({ ...sendForm, recipientId: e.target.value })}
                options={[
                  { value: '', label: 'Select user...' },
                  ...users.map((u) => ({
                    value: u._id,
                    label: `${u.name} (${u.role})`,
                  })),
                ]}
                required
              />
            )}

            <FormInput
              label="Category"
              name="type"
              type="select"
              value={sendForm.type}
              onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
              options={[
                { value: 'general', label: 'General Notice' },
                { value: 'appointment', label: 'Appointment Update' },
                { value: 'system', label: 'System Notice' },
              ]}
            />

            <FormInput
              label="Title"
              name="title"
              value={sendForm.title}
              onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
              placeholder="Schedule or policy announcement"
              required
            />

            <FormInput
              label="Message"
              name="message"
              type="textarea"
              value={sendForm.message}
              onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
              required
              className="form-grid-full"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSendOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
