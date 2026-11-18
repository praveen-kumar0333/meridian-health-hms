import { Bell, Check } from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { formatDateTime } from '../utils/formatters.js';

export default function NotificationPanel({
  notifications = [],
  loading = false,
  onMarkRead,
  showRecipient = false,
}) {
  if (loading) {
    return <LoadingSpinner label="Loading notifications..." />;
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        message="Appointment updates, clinical records, and billing alerts will appear here."
      />
    );
  }

  return (
    <div className="feed-list">
      {notifications.map((item) => (
        <div
          key={item._id}
          className={`feed-item ${!item.isRead ? 'is-unread' : ''}`}
        >
          <div className="feed-item-body">
            <div className="feed-item-title">{item.title}</div>
            <p className="feed-item-text">{item.message}</p>
            <div className="meta-line">
              <span style={{ textTransform: 'capitalize' }}>
                {String(item.type || 'general').replace('_', ' ')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatDateTime(item.createdAt)}</span>
              {showRecipient && item.recipient?.name && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    To: {item.recipient.name} ({item.recipient.role})
                  </span>
                </>
              )}
              {!item.isRead && (
                <>
                  <span aria-hidden="true">·</span>
                  <span style={{ color: 'var(--brand-teal)', fontWeight: 600 }}>Unread</span>
                </>
              )}
            </div>
          </div>
          {!item.isRead && onMarkRead && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onMarkRead(item._id)}
            >
              <Check size={14} />
              Mark Read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
