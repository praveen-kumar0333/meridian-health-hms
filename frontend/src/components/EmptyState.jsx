import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  message = 'There are no items matching your current view.',
  action = null,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={20} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
