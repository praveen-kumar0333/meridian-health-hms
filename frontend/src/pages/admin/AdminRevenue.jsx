import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardCard from '../../components/DashboardCard.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { VerticalBarChart } from '../../components/AnalyticsCharts.jsx';
import { formatCurrency, getErrorMessage } from '../../utils/formatters.js';

export default function AdminRevenue() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadAnalytics = useCallback(
    async (dates = { startDate, endDate }) => {
      setLoading(true);
      try {
        const params = {};
        if (dates.startDate) params.startDate = dates.startDate;
        if (dates.endDate) params.endDate = dates.endDate;
        const res = await api.get('/billing/analytics', { params });
        setAnalytics(res.data || null);
      } catch (err) {
        showToast(getErrorMessage(err, 'Unable to load revenue analytics.'), 'error');
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, showToast]
  );

  useEffect(() => {
    loadAnalytics({ startDate: '', endDate: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    loadAnalytics({ startDate, endDate });
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    loadAnalytics({ startDate: '', endDate: '' });
  };

  const summary = analytics?.summary || {};
  const dailyTrend = analytics?.dailyTrend || [];
  const monthlyTrend = analytics?.monthlyTrend || [];
  const yearlyComparison = analytics?.yearlyComparison || [];
  const paidVsPending = analytics?.paidVsPending || [];
  const departmentRevenue = analytics?.departmentRevenue || { supported: false, items: [] };

  const totalBreakdownAmount = Math.max(
    1,
    paidVsPending.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  );
  const maxDeptAmount = Math.max(
    1,
    ...(departmentRevenue.items || []).map((d) => Number(d.collected) || 0)
  );

  const getBreakdownFillClass = (status) => {
    if (status === 'Paid') return 'dept-bar-fill--approved';
    if (status === 'Pending') return 'dept-bar-fill--pending';
    if (status === 'Overdue') return 'dept-bar-fill--cancelled';
    return '';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Revenue Analytics</h1>
          <p>
            Collected hospital income, pending receivables, and historical invoice performance from
            billing records.
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/admin/billing" className="btn btn-secondary">
            <CreditCard size={16} />
            Manage Billing & Invoices
          </Link>
        </div>
      </div>

      <div className="surface-card" style={{ marginBottom: '20px' }}>
        <div className="table-toolbar">
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong>Accounting Basis:</strong> Collected revenue counts settled{' '}
            <strong>Paid</strong> invoices; pending receivables track <strong>Pending</strong> and{' '}
            <strong>Overdue</strong> balances separately.
          </div>
          <form className="toolbar-filters" onSubmit={handleApplyFilter}>
            <label className="meta-line" htmlFor="rev-start">
              From
            </label>
            <input
              id="rev-start"
              type="date"
              className="form-control form-control--inline"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <label className="meta-line" htmlFor="rev-end">
              To
            </label>
            <input
              id="rev-end"
              type="date"
              className="form-control form-control--inline"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              Apply Range
            </button>
            {(startDate || endDate) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Aggregating hospital revenue analytics..." />
      ) : (
        <>
          <div className="stats-grid">
            <DashboardCard
              label="Total Collected Revenue"
              value={formatCurrency(summary.totalCollectedRevenue)}
              hint={`${summary.paidInvoicesCount ?? 0} settled paid invoices`}
              icon={DollarSign}
              tone="teal"
            />
            <DashboardCard
              label="Today's Collected Revenue"
              value={formatCurrency(summary.todaysCollectedRevenue)}
              hint="Settled payments today"
              icon={Calendar}
            />
            <DashboardCard
              label="Monthly Collected Revenue"
              value={formatCurrency(summary.monthlyCollectedRevenue)}
              hint="Current calendar month"
              icon={TrendingUp}
              tone="teal"
            />
            <DashboardCard
              label="Yearly Collected Revenue"
              value={formatCurrency(summary.yearlyCollectedRevenue)}
              hint="Current calendar year"
              icon={BarChart3}
            />
          </div>

          <div className="stats-grid stats-grid--three">
            <DashboardCard
              label="Pending Payments"
              value={formatCurrency(summary.pendingPayments)}
              hint="Unpaid Pending & Overdue invoices"
              icon={Clock}
            />
            <DashboardCard
              label="Paid Invoices"
              value={summary.paidInvoicesCount ?? 0}
              hint="In selected period"
              icon={CheckCircle2}
              tone="teal"
            />
            <DashboardCard
              label="Unpaid Invoices"
              value={summary.unpaidInvoicesCount ?? 0}
              hint="Pending or Overdue in range"
              icon={CreditCard}
            />
          </div>

          <div className="analytics-grid-two">
            <section className="surface-card">
              <div className="surface-header">
                <h2>Daily Revenue Trend</h2>
                <span className="meta-line">Collected vs Pending</span>
              </div>
              <div className="surface-body">
                <VerticalBarChart
                  data={dailyTrend}
                  valueKey="collected"
                  secondaryKey="pending"
                  primaryLabel="Collected"
                  secondaryLabel="Pending"
                  emptyMessage="No daily billing records found for this date window."
                />
              </div>
            </section>

            <section className="surface-card">
              <div className="surface-header">
                <h2>Monthly Revenue Trend</h2>
                <span className="meta-line">Trailing & Filtered Months</span>
              </div>
              <div className="surface-body">
                <VerticalBarChart
                  data={monthlyTrend}
                  valueKey="collected"
                  secondaryKey="pending"
                  primaryLabel="Collected"
                  secondaryLabel="Pending"
                  emptyMessage="No monthly billing records found for this date window."
                />
              </div>
            </section>
          </div>

          <div className="analytics-grid-two">
            <section className="surface-card">
              <div className="surface-header">
                <h2>Yearly Revenue Comparison</h2>
                <span className="meta-line">Collected vs Outstanding</span>
              </div>
              <div className="surface-body">
                <VerticalBarChart
                  data={yearlyComparison}
                  valueKey="collected"
                  secondaryKey="pending"
                  primaryLabel="Collected"
                  secondaryLabel="Pending"
                  emptyMessage="No yearly billing data recorded yet."
                />
              </div>
            </section>

            <section className="surface-card">
              <div className="surface-header">
                <h2>Paid vs Pending Invoices Breakdown</h2>
                <span className="meta-line">By Billing Status</span>
              </div>
              <div className="surface-body">
                {paidVsPending.every((item) => item.count === 0) ? (
                  <EmptyState
                    title="No invoices in range"
                    message="Generate invoices in Billing & Invoices to see status distribution."
                  />
                ) : (
                  <div className="dept-bar-list">
                    {paidVsPending.map((item) => {
                      const pct = Math.round((Number(item.amount || 0) / totalBreakdownAmount) * 100);
                      return (
                        <div key={item.status} className="dept-bar-row">
                          <div className="dept-bar-meta">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <StatusBadge status={item.status} />
                              <span className="meta-line tabular-nums">({item.count} invoices)</span>
                            </span>
                            <strong className="tabular-nums">
                              {formatCurrency(item.amount)} ({pct}%)
                            </strong>
                          </div>
                          <div className="dept-bar-track">
                            <div
                              className={`dept-bar-fill ${getBreakdownFillClass(item.status)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="surface-card">
            <div className="surface-header">
              <h2>Department-Wise Collected Revenue</h2>
              <span className="meta-line">Appointment-Linked Paid Invoices</span>
            </div>
            <div className="surface-body">
              {!departmentRevenue.supported || departmentRevenue.items.length === 0 ? (
                <EmptyState
                  title="No department-linked paid invoices yet"
                  message="Department revenue breakdowns appear automatically for paid invoices linked to scheduled clinical appointments."
                />
              ) : (
                <div className="dept-bar-list">
                  {departmentRevenue.items.map((item) => (
                    <div key={item.department} className="dept-bar-row">
                      <div className="dept-bar-meta">
                        <span>{item.department}</span>
                        <strong className="tabular-nums">{formatCurrency(item.collected)}</strong>
                      </div>
                      <div className="dept-bar-track">
                        <div
                          className="dept-bar-fill dept-bar-fill--approved"
                          style={{
                            width: `${Math.round((Number(item.collected || 0) / maxDeptAmount) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
