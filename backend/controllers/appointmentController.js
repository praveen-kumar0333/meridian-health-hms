import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import {
  isValidDateString,
  minutesToTime,
  timeToMinutes,
} from '../utils/validators.js';

const ACTIVE_SLOT_STATUSES = ['Pending', 'Approved'];

const checkSlotOverlap = async ({
  doctorId,
  appointmentDate,
  startMinutes,
  endMinutes,
  excludeAppointmentId = null,
}) => {
  const query = {
    doctor: doctorId,
    appointmentDate,
    status: { $in: ACTIVE_SLOT_STATUSES },
    startMinutes: { $lt: endMinutes },
    endMinutes: { $gt: startMinutes },
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  return Appointment.findOne(query);
};

const getWeekdayName = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
};

const checkDoctorScheduleEligibility = (doctor, appointmentDate, startMinutes, endMinutes) => {
  const weekday = getWeekdayName(appointmentDate);
  if (
    Array.isArray(doctor.availableDays) &&
    doctor.availableDays.length > 0 &&
    !doctor.availableDays.includes(weekday)
  ) {
    return `Dr. ${doctor.user?.name || 'Selected doctor'} is not available on ${weekday}s.`;
  }

  const docStart = timeToMinutes(doctor.workingHours?.start || '09:00') ?? 540;
  const docEnd = timeToMinutes(doctor.workingHours?.end || '17:00') ?? 1020;

  if (startMinutes < docStart || endMinutes > docEnd) {
    return `Appointment time must fall within Dr. ${doctor.user?.name || 'doctor'}'s working hours (${doctor.workingHours?.start || '09:00'} - ${doctor.workingHours?.end || '17:00'}).`;
  }

  return null;
};

export const getDoctorAvailability = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: 'Valid doctorId and date (YYYY-MM-DD) are required.',
      });
    }

    const doctor = await Doctor.findById(doctorId).populate('user', 'name');
    if (!doctor || !doctor.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Active doctor not found.',
      });
    }

    const weekday = getWeekdayName(date);
    if (
      Array.isArray(doctor.availableDays) &&
      doctor.availableDays.length > 0 &&
      !doctor.availableDays.includes(weekday)
    ) {
      return res.status(200).json({
        success: true,
        doctorName: doctor.user?.name || '',
        date,
        dayOff: true,
        message: `Dr. ${doctor.user?.name || 'Doctor'} is unavailable on ${weekday}s.`,
        slots: [],
        bookedSlots: [],
      });
    }

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: date,
      status: { $in: ACTIVE_SLOT_STATUSES },
    }).select('startTime endTime startMinutes endMinutes status');

    const startMin = timeToMinutes(doctor.workingHours?.start || '09:00') ?? 540;
    const endMin = timeToMinutes(doctor.workingHours?.end || '17:00') ?? 1020;
    const slotDuration = 30;
    const slots = [];

    for (let t = startMin; t + slotDuration <= endMin; t += slotDuration) {
      const slotEnd = t + slotDuration;
      const isBooked = bookedAppointments.some(
        (appt) => appt.startMinutes < slotEnd && appt.endMinutes > t
      );
      slots.push({
        startTime: minutesToTime(t),
        endTime: minutesToTime(slotEnd),
        available: !isBooked,
      });
    }

    return res.status(200).json({
      success: true,
      doctorName: doctor.user?.name || '',
      date,
      dayOff: false,
      slots,
      bookedSlots: bookedAppointments,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAppointments = async (req, res, next) => {
  try {
    const { status = '', date = '', department = '', search = '' } = req.query;
    const query = {};

    if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }
      query.doctor = req.doctorProfile._id;
    } else if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      query.patient = req.patientProfile._id;
    }

    if (status.trim()) query.status = status.trim();
    if (date.trim()) query.appointmentDate = date.trim();
    if (department.trim()) query.department = department.trim();

    let appointments = await Appointment.find(query)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phone' },
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'name email phone' },
      })
      .sort({ appointmentDate: -1, startMinutes: 1 });

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      appointments = appointments.filter(
        (a) =>
          a.patient?.user?.name?.toLowerCase().includes(term) ||
          a.doctor?.user?.name?.toLowerCase().includes(term) ||
          a.department?.toLowerCase().includes(term) ||
          a.reason?.toLowerCase().includes(term)
      );
    }

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    return next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const {
      patientId,
      doctorId,
      department,
      appointmentDate,
      startTime,
      endTime,
      reason,
      notes,
      status,
    } = req.body;

    let targetPatientId = patientId;
    if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      targetPatientId = req.patientProfile._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only patients or administrators can book appointments.',
      });
    }

    if (!targetPatientId || !doctorId || !isValidDateString(appointmentDate) || !startTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Patient, doctor, valid date (YYYY-MM-DD), start time, and reason are required.',
      });
    }

    const [patient, doctor] = await Promise.all([
      Patient.findById(targetPatientId).populate('user', 'name'),
      Doctor.findById(doctorId).populate('user', 'name'),
    ]);

    if (!patient || patient.isArchived) {
      return res.status(404).json({ success: false, message: 'Active patient not found.' });
    }
    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ success: false, message: 'Active doctor not found.' });
    }

    const startMinutes = timeToMinutes(startTime);
    if (startMinutes === null) {
      return res.status(400).json({ success: false, message: 'Invalid start time format (HH:mm).' });
    }

    const computedEndMinutes = endTime ? timeToMinutes(endTime) : startMinutes + 30;
    if (computedEndMinutes === null || computedEndMinutes <= startMinutes) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time.',
      });
    }

    const scheduleError = checkDoctorScheduleEligibility(
      doctor,
      appointmentDate,
      startMinutes,
      computedEndMinutes
    );
    if (scheduleError) {
      return res.status(400).json({ success: false, message: scheduleError });
    }

    const resolvedEndTime = minutesToTime(computedEndMinutes);

    // Prevent double booking and overlapping slots for the same doctor
    const overlapping = await checkSlotOverlap({
      doctorId: doctor._id,
      appointmentDate,
      startMinutes,
      endMinutes: computedEndMinutes,
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: `Time slot ${startTime} - ${resolvedEndTime} overlaps with an existing appointment (${overlapping.startTime} - ${overlapping.endTime}) for Dr. ${doctor.user.name}.`,
      });
    }

    const initialStatus =
      req.user.role === 'admin' && ['Pending', 'Approved'].includes(status)
        ? status
        : 'Pending';

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department ? department.trim() : doctor.department,
      appointmentDate,
      startTime,
      endTime: resolvedEndTime,
      startMinutes,
      endMinutes: computedEndMinutes,
      reason: reason.trim(),
      notes: notes ? notes.trim() : '',
      status: initialStatus,
      createdBy: req.user._id,
    });

    await Promise.all([
      Notification.create({
        recipient: doctor.user._id,
        sender: req.user._id,
        title: 'New Appointment Request',
        message: `${patient.user.name} requested an appointment on ${appointmentDate} at ${startTime}.`,
        type: 'appointment',
        relatedId: appointment._id,
      }),
      Notification.create({
        recipient: patient.user._id,
        sender: req.user._id,
        title: initialStatus === 'Approved' ? 'Appointment Confirmed' : 'Appointment Requested',
        message: `Your appointment with Dr. ${doctor.user.name} on ${appointmentDate} at ${startTime} is ${initialStatus}.`,
        type: 'appointment',
        relatedId: appointment._id,
      }),
    ]);

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email phone' } });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment: populated,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, notes, rescheduleRequested, rescheduleNote } = req.body;
    const appointment = await Appointment.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const allowedStatuses = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment status.' });
    }

    if (req.user.role === 'patient') {
      if (
        !req.patientProfile ||
        String(appointment.patient._id) !== String(req.patientProfile._id)
      ) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (status !== 'Cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Patients may only cancel their own appointments.',
        });
      }
      if (!['Pending', 'Approved'].includes(appointment.status)) {
        return res.status(400).json({
          success: false,
          message: 'Only pending or approved appointments can be cancelled.',
        });
      }
    } else if (req.user.role === 'doctor') {
      if (
        !req.doctorProfile ||
        String(appointment.doctor._id) !== String(req.doctorProfile._id)
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only manage your own assigned appointments.',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // If re-activating into Pending/Approved from Cancelled/Rejected, check overlap again
    if (
      status &&
      ACTIVE_SLOT_STATUSES.includes(status) &&
      !ACTIVE_SLOT_STATUSES.includes(appointment.status)
    ) {
      const overlapping = await checkSlotOverlap({
        doctorId: appointment.doctor._id,
        appointmentDate: appointment.appointmentDate,
        startMinutes: appointment.startMinutes,
        endMinutes: appointment.endMinutes,
        excludeAppointmentId: appointment._id,
      });
      if (overlapping) {
        return res.status(409).json({
          success: false,
          message: 'Cannot reactivate appointment because the slot is already booked.',
        });
      }
    }

    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = String(notes).trim();
    if (typeof rescheduleRequested === 'boolean') {
      appointment.rescheduleRequested = rescheduleRequested;
    }
    if (rescheduleNote !== undefined) {
      appointment.rescheduleNote = String(rescheduleNote).trim();
    }
    appointment.updatedBy = req.user._id;
    await appointment.save();

    const statusLabel = appointment.rescheduleRequested
      ? `${appointment.status} (Reschedule Requested)`
      : appointment.status;

    const notificationsToCreate = [
      {
        recipient: appointment.patient.user._id,
        sender: req.user._id,
        title: `Appointment ${statusLabel}`,
        message: `Your appointment with Dr. ${appointment.doctor.user.name} on ${appointment.appointmentDate} at ${appointment.startTime} is now ${statusLabel}.${
          appointment.rescheduleNote ? ` Note: ${appointment.rescheduleNote}` : ''
        }`,
        type: 'appointment',
        relatedId: appointment._id,
      },
    ];

    if (req.user.role !== 'doctor') {
      notificationsToCreate.push({
        recipient: appointment.doctor.user._id,
        sender: req.user._id,
        title: `Appointment ${statusLabel}`,
        message: `Appointment with ${appointment.patient.user.name} on ${appointment.appointmentDate} at ${appointment.startTime} was updated to ${statusLabel}.`,
        type: 'appointment',
        relatedId: appointment._id,
      });
    }

    await Notification.insertMany(notificationsToCreate);

    const updated = await Appointment.findById(appointment._id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email phone' } });

    return res.status(200).json({
      success: true,
      message: 'Appointment updated successfully.',
      appointment: updated,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAppointmentDetails = async (req, res, next) => {
  try {
    const { doctorId, appointmentDate, startTime, endTime, department, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const targetDoctorId = doctorId || appointment.doctor;
    const targetDate = appointmentDate || appointment.appointmentDate;
    const targetStartTime = startTime || appointment.startTime;

    if (!isValidDateString(targetDate)) {
      return res.status(400).json({ success: false, message: 'Invalid date format.' });
    }

    const startMinutes = timeToMinutes(targetStartTime);
    if (startMinutes === null) {
      return res.status(400).json({ success: false, message: 'Invalid start time format.' });
    }

    const endMinutes = endTime
      ? timeToMinutes(endTime)
      : startMinutes + (appointment.endMinutes - appointment.startMinutes || 30);

    if (endMinutes === null || endMinutes <= startMinutes) {
      return res.status(400).json({ success: false, message: 'Invalid time range.' });
    }

    const doctor = await Doctor.findById(targetDoctorId).populate('user', 'name');
    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ success: false, message: 'Active doctor not found.' });
    }

    const scheduleError = checkDoctorScheduleEligibility(
      doctor,
      targetDate,
      startMinutes,
      endMinutes
    );
    if (scheduleError) {
      return res.status(400).json({ success: false, message: scheduleError });
    }

    if (ACTIVE_SLOT_STATUSES.includes(appointment.status)) {
      const overlapping = await checkSlotOverlap({
        doctorId: doctor._id,
        appointmentDate: targetDate,
        startMinutes,
        endMinutes,
        excludeAppointmentId: appointment._id,
      });

      if (overlapping) {
        return res.status(409).json({
          success: false,
          message: `Slot overlaps with another appointment (${overlapping.startTime} - ${overlapping.endTime}).`,
        });
      }
    }

    appointment.doctor = doctor._id;
    appointment.department = department ? department.trim() : doctor.department;
    appointment.appointmentDate = targetDate;
    appointment.startTime = targetStartTime;
    appointment.endTime = minutesToTime(endMinutes);
    appointment.startMinutes = startMinutes;
    appointment.endMinutes = endMinutes;
    appointment.rescheduleRequested = false;
    if (notes !== undefined) appointment.notes = String(notes).trim();
    appointment.updatedBy = req.user._id;

    await appointment.save();

    const updated = await Appointment.findById(appointment._id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email phone' } });

    return res.status(200).json({
      success: true,
      message: 'Appointment schedule updated.',
      appointment: updated,
    });
  } catch (error) {
    return next(error);
  }
};
