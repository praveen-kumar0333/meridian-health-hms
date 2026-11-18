import Billing from '../models/Billing.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { generateCode } from '../utils/validators.js';

export const getInvoices = async (req, res, next) => {
  try {
    const { status = '', search = '' } = req.query;
    const query = {};

    if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      query.patient = req.patientProfile._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (status.trim()) query.paymentStatus = status.trim();

    let invoices = await Billing.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
      .populate('appointment', 'appointmentDate startTime department')
      .sort({ createdAt: -1 });

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(term) ||
          inv.patient?.user?.name?.toLowerCase().includes(term)
      );
    }

    const summary = invoices.reduce(
      (acc, inv) => {
        if (inv.paymentStatus === 'Paid') acc.totalPaid += inv.totalAmount;
        if (inv.paymentStatus === 'Pending' || inv.paymentStatus === 'Overdue') {
          acc.totalPending += inv.totalAmount;
        }
        return acc;
      },
      { totalPaid: 0, totalPending: 0 }
    );

    return res.status(200).json({
      success: true,
      count: invoices.length,
      summary,
      invoices,
    });
  } catch (error) {
    return next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      items,
      taxAmount = 0,
      discountAmount = 0,
      paymentStatus = 'Pending',
      paymentMethod = 'Unpaid',
      dueDate,
      notes,
    } = req.body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient and at least one invoice line item are required.',
      });
    }

    const patient = await Patient.findById(patientId).populate('user', 'name');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const formattedItems = items.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Math.max(0, Number(item.unitPrice) || 0);
      return {
        description: String(item.description || '').trim(),
        quantity: qty,
        unitPrice: price,
        amount: qty * price,
      };
    });

    if (formattedItems.some((i) => !i.description)) {
      return res.status(400).json({
        success: false,
        message: 'Every invoice item must have a description.',
      });
    }

    const subtotal = formattedItems.reduce((sum, i) => sum + i.amount, 0);
    const tax = Math.max(0, Number(taxAmount) || 0);
    const discount = Math.max(0, Number(discountAmount) || 0);
    const totalAmount = Math.max(0, subtotal + tax - discount);

    const invoice = await Billing.create({
      invoiceNumber: generateCode('INV'),
      patient: patient._id,
      appointment: appointmentId || null,
      items: formattedItems,
      subtotal,
      taxAmount: tax,
      discountAmount: discount,
      totalAmount,
      paymentStatus,
      paymentMethod: paymentStatus === 'Paid' ? paymentMethod || 'Card' : paymentMethod,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paidAt: paymentStatus === 'Paid' ? new Date() : null,
      notes: notes ? String(notes).trim() : '',
      createdBy: req.user._id,
    });

    await Notification.create({
      recipient: patient.user._id,
      sender: req.user._id,
      title: `New Invoice ${invoice.invoiceNumber}`,
      message: `An invoice of $${totalAmount.toFixed(2)} has been generated (${paymentStatus}).`,
      type: 'billing',
      relatedId: invoice._id,
    });

    const populated = await Billing.findById(invoice._id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } });

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      invoice: populated,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod, notes } = req.body;
    const invoice = await Billing.findById(req.params.id).populate({
      path: 'patient',
      populate: { path: 'user', select: 'name' },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (paymentStatus) invoice.paymentStatus = paymentStatus;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (notes !== undefined) invoice.notes = String(notes).trim();

    if (paymentStatus === 'Paid') {
      invoice.paidAt = new Date();
      if (invoice.paymentMethod === 'Unpaid') invoice.paymentMethod = 'Card';
    } else if (paymentStatus === 'Pending' || paymentStatus === 'Overdue') {
      invoice.paidAt = null;
    }

    await invoice.save();

    await Notification.create({
      recipient: invoice.patient.user._id,
      sender: req.user._id,
      title: `Invoice ${invoice.invoiceNumber} Updated`,
      message: `Your invoice payment status is now ${invoice.paymentStatus}.`,
      type: 'billing',
      relatedId: invoice._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice status updated.',
      invoice,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Billing.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    return res.status(200).json({ success: true, message: 'Invoice deleted.' });
  } catch (error) {
    return next(error);
  }
};

const toLocalDayKey = (dateObj) => {
  const d = new Date(dateObj);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { startDate = '', endDate = '' } = req.query;
    const invoices = await Billing.find({})
      .populate('appointment', 'department')
      .select('totalAmount paymentStatus paidAt createdAt appointment');

    const now = new Date();
    const todayKey = toLocalDayKey(now);
    const currentMonthKey = todayKey.slice(0, 7);
    const currentYear = String(now.getFullYear());

    const startBound = startDate.trim() ? new Date(`${startDate.trim()}T00:00:00`) : null;
    const endBound = endDate.trim() ? new Date(`${endDate.trim()}T23:59:59.999`) : null;

    const filteredInvoices = invoices.filter((inv) => {
      const refDate = inv.paymentStatus === 'Paid' && inv.paidAt ? new Date(inv.paidAt) : new Date(inv.createdAt);
      if (startBound && !Number.isNaN(startBound.getTime()) && refDate < startBound) return false;
      if (endBound && !Number.isNaN(endBound.getTime()) && refDate > endBound) return false;
      return true;
    });

    const summary = {
      totalCollectedRevenue: 0,
      todaysCollectedRevenue: 0,
      monthlyCollectedRevenue: 0,
      yearlyCollectedRevenue: 0,
      pendingPayments: 0,
      paidInvoicesCount: 0,
      unpaidInvoicesCount: 0,
      totalInvoicesCount: filteredInvoices.length,
    };

    const statusMap = {
      Paid: { status: 'Paid', count: 0, amount: 0 },
      Pending: { status: 'Pending', count: 0, amount: 0 },
      Overdue: { status: 'Overdue', count: 0, amount: 0 },
      Cancelled: { status: 'Cancelled', count: 0, amount: 0 },
    };

    const dailyMap = new Map();
    const monthlyMap = new Map();
    const yearlyMap = new Map();
    const deptMap = new Map();

    // Pre-seed last 14 days for daily trend continuity when no custom range or short range
    const rangeEnd = endBound && !Number.isNaN(endBound.getTime()) ? new Date(endBound) : new Date(now);
    const rangeStart =
      startBound && !Number.isNaN(startBound.getTime())
        ? new Date(startBound)
        : new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() - 13);

    const daySpan = Math.min(31, Math.max(1, Math.round((rangeEnd - rangeStart) / (24 * 60 * 60 * 1000)) + 1));
    for (let i = 0; i < daySpan; i += 1) {
      const cursor = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() - (daySpan - 1 - i));
      const key = toLocalDayKey(cursor);
      dailyMap.set(key, {
        date: key,
        label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        collected: 0,
        pending: 0,
      });
    }

    // Pre-seed trailing 6 months for monthly continuity
    for (let i = 5; i >= 0; i -= 1) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(mKey, {
        month: mKey,
        label: mDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        collected: 0,
        pending: 0,
      });
    }

    // Calculate live today/month/year collected metrics from all paid records (unfiltered KPI snapshots)
    invoices.forEach((inv) => {
      if (inv.paymentStatus === 'Paid') {
        const paidDateKey = toLocalDayKey(inv.paidAt || inv.createdAt);
        if (paidDateKey === todayKey) summary.todaysCollectedRevenue += inv.totalAmount;
        if (paidDateKey.slice(0, 7) === currentMonthKey) summary.monthlyCollectedRevenue += inv.totalAmount;
        if (paidDateKey.slice(0, 4) === currentYear) summary.yearlyCollectedRevenue += inv.totalAmount;
      }
    });

    filteredInvoices.forEach((inv) => {
      const statusEntry = statusMap[inv.paymentStatus] || statusMap.Pending;
      statusEntry.count += 1;
      statusEntry.amount += inv.totalAmount;

      const refDate = inv.paymentStatus === 'Paid' && inv.paidAt ? new Date(inv.paidAt) : new Date(inv.createdAt);
      const dayKey = toLocalDayKey(refDate);
      const monthKey = dayKey.slice(0, 7);
      const yearKey = dayKey.slice(0, 4);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          label: refDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          collected: 0,
          pending: 0,
        });
      }
      if (!yearlyMap.has(yearKey)) {
        yearlyMap.set(yearKey, { year: yearKey, collected: 0, pending: 0, invoiceCount: 0 });
      }

      const yearEntry = yearlyMap.get(yearKey);
      yearEntry.invoiceCount += 1;

      if (inv.paymentStatus === 'Paid') {
        summary.totalCollectedRevenue += inv.totalAmount;
        summary.paidInvoicesCount += 1;
        if (dailyMap.has(dayKey)) dailyMap.get(dayKey).collected += inv.totalAmount;
        monthlyMap.get(monthKey).collected += inv.totalAmount;
        yearEntry.collected += inv.totalAmount;

        if (inv.appointment?.department) {
          const dept = inv.appointment.department;
          deptMap.set(dept, (deptMap.get(dept) || 0) + inv.totalAmount);
        }
      } else if (inv.paymentStatus === 'Pending' || inv.paymentStatus === 'Overdue') {
        summary.pendingPayments += inv.totalAmount;
        summary.unpaidInvoicesCount += 1;
        if (dailyMap.has(dayKey)) dailyMap.get(dayKey).pending += inv.totalAmount;
        monthlyMap.get(monthKey).pending += inv.totalAmount;
        yearEntry.pending += inv.totalAmount;
      }
    });

    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
    const yearlyComparison = Array.from(yearlyMap.values()).sort((a, b) =>
      a.year.localeCompare(b.year)
    );
    const departmentRevenue = Array.from(deptMap.entries())
      .map(([department, collected]) => ({ department, collected }))
      .sort((a, b) => b.collected - a.collected);

    return res.status(200).json({
      success: true,
      summary,
      dailyTrend: Array.from(dailyMap.values()),
      monthlyTrend,
      yearlyComparison,
      paidVsPending: Object.values(statusMap),
      departmentRevenue: {
        supported: departmentRevenue.length > 0,
        items: departmentRevenue,
      },
    });
  } catch (error) {
    return next(error);
  }
};
