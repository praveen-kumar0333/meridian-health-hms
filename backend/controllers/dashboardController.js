import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { getTodayDateString } from '../utils/validators.js';

export const getAdminDashboard = async (req, res, next) => {
  try {
    const today = getTodayDateString();

    const [
      totalPatients,
      totalDoctors,
      activeDoctors,
      totalAppointments,
      todaysAppointments,
      pendingAppointments,
      recentAppointments,
      billingSummary,
      recentNotifications,
      appointmentStatusCounts,
    ] = await Promise.all([
      Patient.countDocuments({ isArchived: false }),
      Doctor.countDocuments({}),
      Doctor.countDocuments({ isActive: true }),
      Appointment.countDocuments({}),
      Appointment.countDocuments({ appointmentDate: today, status: { $ne: 'Cancelled' } }),
      Appointment.countDocuments({ status: 'Pending' }),
      Appointment.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } }),
      Billing.aggregate([
        {
          $group: {
            _id: '$paymentStatus',
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Notification.find({}).sort({ createdAt: -1 }).limit(6).populate('recipient', 'name role'),
      Appointment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const departmentCounts = await Doctor.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    let paidTotal = 0;
    let pendingTotal = 0;
    billingSummary.forEach((entry) => {
      if (entry._id === 'Paid') paidTotal = entry.total;
      if (entry._id === 'Pending' || entry._id === 'Overdue') pendingTotal += entry.total;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalPatients,
        totalDoctors,
        activeDoctors,
        totalAppointments,
        todaysAppointments,
        pendingAppointments,
        paidRevenue: paidTotal,
        pendingRevenue: pendingTotal,
      },
      departmentCounts,
      appointmentStatusCounts,
      recentAppointments,
      recentActivities: recentNotifications,
    });
  } catch (error) {
    return next(error);
  }
};

export const getDoctorDashboard = async (req, res, next) => {
  try {
    if (!req.doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const doctorId = req.doctorProfile._id;
    const today = getTodayDateString();

    const [
      todaysAppointments,
      upcomingAppointments,
      pendingRequests,
      assignedPatientsCount,
      appointmentPatients,
      recentRecords,
      notifications,
    ] = await Promise.all([
      Appointment.find({
        doctor: doctorId,
        appointmentDate: today,
        status: { $in: ['Pending', 'Approved', 'Completed'] },
      })
        .sort({ startMinutes: 1 })
        .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } }),
      Appointment.find({
        doctor: doctorId,
        appointmentDate: { $gt: today },
        status: { $in: ['Pending', 'Approved'] },
      })
        .sort({ appointmentDate: 1, startMinutes: 1 })
        .limit(8)
        .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } }),
      Appointment.countDocuments({ doctor: doctorId, status: 'Pending' }),
      Patient.countDocuments({ assignedDoctor: doctorId, isArchived: false }),
      Appointment.distinct('patient', { doctor: doctorId }),
      MedicalRecord.find({ doctor: doctorId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({ path: 'patient', populate: { path: 'user', select: 'name' } }),
      Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(6),
    ]);

    const assignedPatientIds = await Patient.distinct('_id', {
      assignedDoctor: doctorId,
      isArchived: false,
    });
    const combinedPatientSet = new Set([
      ...assignedPatientIds.map((id) => String(id)),
      ...appointmentPatients.map((id) => String(id)),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        todaysCount: todaysAppointments.length,
        upcomingCount: upcomingAppointments.length,
        pendingRequests,
        assignedPatients: Math.max(assignedPatientsCount, combinedPatientSet.size),
      },
      todaysAppointments,
      upcomingAppointments,
      recentRecords,
      recentActivities: notifications,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPatientDashboard = async (req, res, next) => {
  try {
    if (!req.patientProfile) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const patientId = req.patientProfile._id;
    const today = getTodayDateString();

    const [
      upcomingAppointments,
      previousAppointments,
      recentRecords,
      pendingBills,
      notifications,
      unreadNotificationsCount,
    ] = await Promise.all([
      Appointment.find({
        patient: patientId,
        appointmentDate: { $gte: today },
        status: { $in: ['Pending', 'Approved'] },
      })
        .sort({ appointmentDate: 1, startMinutes: 1 })
        .limit(6)
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name email' } }),
      Appointment.find({
        patient: patientId,
        $or: [
          { appointmentDate: { $lt: today } },
          { status: { $in: ['Completed', 'Cancelled', 'Rejected'] } },
        ],
      })
        .sort({ appointmentDate: -1, startMinutes: -1 })
        .limit(6)
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } }),
      MedicalRecord.find({ patient: patientId })
        .sort({ visitDate: -1 })
        .limit(5)
        .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } }),
      Billing.find({ patient: patientId, paymentStatus: { $in: ['Pending', 'Overdue'] } }),
      Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(6),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    const outstandingBalance = pendingBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

    return res.status(200).json({
      success: true,
      stats: {
        upcomingCount: upcomingAppointments.length,
        previousCount: previousAppointments.length,
        recordsCount: recentRecords.length,
        unreadNotifications: unreadNotificationsCount,
        outstandingBalance,
      },
      upcomingAppointments,
      previousAppointments,
      recentRecords,
      notifications,
    });
  } catch (error) {
    return next(error);
  }
};
