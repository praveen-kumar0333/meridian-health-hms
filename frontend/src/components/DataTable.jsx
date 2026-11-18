import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';

export default function DataTable({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records available',
  emptyMessage = 'No records matched your criteria.',
  emptyAction = null,
  rowKey = (row) => row._id,
}) {
  if (loading) {
    return <LoadingSpinner label="Loading records..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${col.align === 'right' ? 'text-right' : ''} ${
                    col.tabular ? 'tabular-nums' : ''
                  }`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
