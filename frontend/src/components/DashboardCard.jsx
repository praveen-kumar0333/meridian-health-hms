export default function DashboardCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <div className={`stat-card-icon ${tone === 'teal' ? 'stat-card-icon--teal' : ''}`}>
            <Icon size={17} />
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {hint && <div className="stat-card-hint">{hint}</div>}
    </article>
  );
}
