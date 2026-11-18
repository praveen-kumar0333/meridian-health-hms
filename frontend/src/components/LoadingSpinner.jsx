export default function LoadingSpinner({ label = 'Loading data...' }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="spinner-ring" />
      <span>{label}</span>
    </div>
  );
}
