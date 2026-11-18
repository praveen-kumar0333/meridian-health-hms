import { formatCurrency } from '../utils/formatters.js';

export function VerticalBarChart({
  data = [],
  valueKey = 'collected',
  secondaryKey = '',
  primaryLabel = 'Collected',
  secondaryLabel = 'Pending',
  formatValue = formatCurrency,
  emptyMessage = 'No financial data recorded for this period.',
}) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) =>
      Math.max(Number(d[valueKey]) || 0, secondaryKey ? Number(d[secondaryKey]) || 0 : 0)
    )
  );
  const allZero = data.every(
    (d) => (Number(d[valueKey]) || 0) === 0 && (!secondaryKey || (Number(d[secondaryKey]) || 0) === 0)
  );

  if (allZero) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  const chartHeight = 176;
  const topPad = 14;
  const bottomPad = 28;
  const usableHeight = chartHeight - topPad - bottomPad;
  const slotWidth = Math.max(38, Math.floor(600 / Math.max(1, data.length)));
  const svgWidth = Math.max(420, data.length * slotWidth + 24);

  return (
    <div className="chart-container">
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-swatch chart-swatch--primary" />
          <span>{primaryLabel}</span>
        </span>
        {secondaryKey && (
          <span className="chart-legend-item">
            <span className="chart-swatch chart-swatch--amber" />
            <span>{secondaryLabel}</span>
          </span>
        )}
      </div>

      <div className="chart-svg-scroll">
        <svg
          viewBox={`0 0 ${svgWidth} ${chartHeight}`}
          className="chart-svg"
          role="img"
          aria-label={`${primaryLabel} bar chart`}
        >
          {[0, 0.5, 1].map((step) => {
            const y = topPad + usableHeight * (1 - step);
            return (
              <line
                key={step}
                x1="8"
                x2={svgWidth - 8}
                y1={y}
                y2={y}
                stroke="#DDE6F0"
                strokeDasharray={step === 0 ? undefined : '3 3'}
                strokeWidth="1"
              />
            );
          })}

          {data.map((item, idx) => {
            const val1 = Number(item[valueKey]) || 0;
            const val2 = secondaryKey ? Number(item[secondaryKey]) || 0 : 0;
            const h1 = val1 > 0 ? Math.max(4, (val1 / maxVal) * usableHeight) : 0;
            const h2 = val2 > 0 ? Math.max(4, (val2 / maxVal) * usableHeight) : 0;
            const groupCenter = 12 + idx * slotWidth + slotWidth / 2;
            const barWidth = secondaryKey
              ? Math.min(16, Math.max(8, Math.floor(slotWidth * 0.28)))
              : Math.min(26, Math.max(12, Math.floor(slotWidth * 0.45)));

            return (
              <g key={item.date || item.month || item.year || item.label || idx}>
                {secondaryKey ? (
                  <>
                    <rect
                      x={groupCenter - barWidth - 2}
                      y={topPad + usableHeight - h1}
                      width={barWidth}
                      height={h1}
                      rx="3"
                      fill="#0F4C81"
                    >
                      <title>{`${item.label || item.year}: ${primaryLabel} ${formatValue(val1)}`}</title>
                    </rect>
                    <rect
                      x={groupCenter + 2}
                      y={topPad + usableHeight - h2}
                      width={barWidth}
                      height={h2}
                      rx="3"
                      fill="#D97706"
                    >
                      <title>{`${item.label || item.year}: ${secondaryLabel} ${formatValue(val2)}`}</title>
                    </rect>
                  </>
                ) : (
                  <rect
                    x={groupCenter - barWidth / 2}
                    y={topPad + usableHeight - h1}
                    width={barWidth}
                    height={h1}
                    rx="3"
                    fill="#0D9488"
                  >
                    <title>{`${item.label || item.year}: ${formatValue(val1)}`}</title>
                  </rect>
                )}

                <text
                  x={groupCenter}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="#64748B"
                >
                  {item.label || item.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function BedOccupancyChart({ totalBeds = 0, availableBeds = 0, occupiedBeds = 0, reservedBeds = 0 }) {
  const safeTotal = Math.max(0, Number(totalBeds) || 0);
  if (safeTotal === 0) {
    return (
      <div className="chart-empty">
        Add department bed capacity to visualize occupancy and availability ratios.
      </div>
    );
  }

  const availPct = Math.round((availableBeds / safeTotal) * 100);
  const occPct = Math.round((occupiedBeds / safeTotal) * 100);
  const resPct = Math.max(0, 100 - availPct - occPct);
  const utilizedPct = Math.round(((occupiedBeds + reservedBeds) / safeTotal) * 100);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const occLen = (occupiedBeds / safeTotal) * circumference;
  const resLen = (reservedBeds / safeTotal) * circumference;
  const availLen = Math.max(0, circumference - occLen - resLen);

  return (
    <div className="occupancy-visual">
      <div className="occupancy-donut-wrap">
        <svg viewBox="0 0 140 140" className="occupancy-donut-svg" role="img" aria-label={`Bed occupancy ${utilizedPct}%`}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#EDF2F8" strokeWidth="16" />
          {availLen > 0 && (
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#0D9488"
              strokeWidth="16"
              strokeDasharray={`${availLen} ${circumference}`}
              strokeDashoffset={0}
              transform="rotate(-90 70 70)"
            />
          )}
          {occLen > 0 && (
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#0F4C81"
              strokeWidth="16"
              strokeDasharray={`${occLen} ${circumference}`}
              strokeDashoffset={-availLen}
              transform="rotate(-90 70 70)"
            />
          )}
          {resLen > 0 && (
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#D97706"
              strokeWidth="16"
              strokeDasharray={`${resLen} ${circumference}`}
              strokeDashoffset={-(availLen + occLen)}
              transform="rotate(-90 70 70)"
            />
          )}
          <text x="70" y="67" textAnchor="middle" fontSize="22" fontWeight="700" fill="#172B4D">
            {utilizedPct}%
          </text>
          <text x="70" y="85" textAnchor="middle" fontSize="11" fill="#64748B">
            Occupied / Res.
          </text>
        </svg>
      </div>

      <div className="occupancy-breakdown">
        <div className="dept-bar-row">
          <div className="dept-bar-meta">
            <span>Available Beds</span>
            <strong className="tabular-nums">
              {availableBeds} ({availPct}%)
            </strong>
          </div>
          <div className="dept-bar-track">
            <div className="dept-bar-fill dept-bar-fill--approved" style={{ width: `${availPct}%` }} />
          </div>
        </div>

        <div className="dept-bar-row">
          <div className="dept-bar-meta">
            <span>Occupied Beds</span>
            <strong className="tabular-nums">
              {occupiedBeds} ({occPct}%)
            </strong>
          </div>
          <div className="dept-bar-track">
            <div className="dept-bar-fill" style={{ width: `${occPct}%` }} />
          </div>
        </div>

        <div className="dept-bar-row">
          <div className="dept-bar-meta">
            <span>Reserved Beds</span>
            <strong className="tabular-nums">
              {reservedBeds} ({resPct}%)
            </strong>
          </div>
          <div className="dept-bar-track">
            <div className="dept-bar-fill dept-bar-fill--pending" style={{ width: `${resPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
