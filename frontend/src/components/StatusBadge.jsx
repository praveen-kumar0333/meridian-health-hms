const STATUS_VARIANTS = {
  Approved: 'success',
  Completed: 'info',
  Paid: 'success',
  Active: 'success',
  Available: 'success',
  Pending: 'warning',
  Acknowledged: 'warning',
  Reserved: 'warning',
  High: 'warning',
  'Ambulance Arranged': 'info',
  'Bed Reserved': 'info',
  Occupied: 'info',
  Moderate: 'info',
  Overdue: 'danger',
  Rejected: 'danger',
  New: 'danger',
  Critical: 'danger',
  Full: 'danger',
  Cancelled: 'neutral',
  Inactive: 'neutral',
  Archived: 'neutral',
  Released: 'neutral',
};

export default function StatusBadge({ status }) {
  const variant = STATUS_VARIANTS[status] || 'neutral';
  return <span className={`status-tag status-tag--${variant}`}>{status}</span>;
}
