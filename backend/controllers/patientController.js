import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import { generateCode, isValidEmail } from '../utils/validators.js';

export const getPatients = async (req, res, next) => {
  try {
    const { search = '', archived = 'false' } = req.query;
    const query = { isArchived: archived === 'true' };

    if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }
      const apptPatientIds = await Appointment.distinct('patient', {
        doctor: req.doctorProfile._id,
      });
      query.$or = [
        { assignedDoctor: req.doctorProfile._id },
        { _id: { $in: apptPatientIds } },
      ];
    }

    let patients = await Patient.find(query)
      .populate('user', 'name email phone isActive createdAt')
      .populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ createdAt: -1 });

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      patients = patients.filter(
        (p) =>
          p.user?.name?.toLowerCase().includes(term) ||
          p.user?.email?.toLowerCase().includes(term) ||
          p.user?.phone?.toLowerCase().includes(term) ||
          p.patientCode?.toLowerCase().includes(term) ||
          p.bloodGroup?.toLowerCase().includes(term)
      );
    }

    return res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('user', 'name email phone isActive createdAt')
      .populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email phone' },
      });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    if (req.user.role === 'patient') {
      if (!req.patientProfile || String(req.patientProfile._id) !== String(patient._id)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } else if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      const isAssigned =
        patient.assignedDoctor &&
        String(patient.assignedDoctor._id) === String(req.doctorProfile._id);
      const hasAppt = await Appointment.exists({
        doctor: req.doctorProfile._id,
        patient: patient._id,
      });
      if (!isAssigned && !hasAppt) {
        return res.status(403).json({
          success: false,
          message: 'You are only authorized to view assigned patients.',
        });
      }
    }

    return res.status(200).json({ success: true, patient });
  } catch (error) {
    return next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicConditions,
      assignedDoctor,
    } = req.body;

    if (!name || !name.trim() || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid patient name and email are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const initialPassword = password && password.length >= 6 ? password : 'Patient@123';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: initialPassword,
      role: 'patient',
      phone: phone ? phone.trim() : '',
    });

    const patient = await Patient.create({
      user: user._id,
      patientCode: generateCode('PAT'),
      dateOfBirth: dateOfBirth || null,
      gender: gender || 'Prefer not to say',
      bloodGroup: bloodGroup || 'Unknown',
      address: address ? address.trim() : '',
      emergencyContact: emergencyContact || {},
      allergies: Array.isArray(allergies) ? allergies : [],
      chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
      assignedDoctor: assignedDoctor || null,
    });

    const populated = await Patient.findById(patient._id)
      .populate('user', 'name email phone isActive')
      .populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email' },
      });

    return res.status(201).json({
      success: true,
      message: 'Patient created successfully.',
      patient: populated,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    if (req.user.role === 'patient') {
      if (!req.patientProfile || String(req.patientProfile._id) !== String(patient._id)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const {
      name,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicConditions,
      assignedDoctor,
      isArchived,
    } = req.body;

    const user = await User.findById(patient.user);
    if (user) {
      if (name && name.trim()) user.name = name.trim();
      if (phone !== undefined) user.phone = String(phone).trim();
      await user.save();
    }

    if (dateOfBirth !== undefined) patient.dateOfBirth = dateOfBirth || null;
    if (gender !== undefined) patient.gender = gender;
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
    if (address !== undefined) patient.address = String(address).trim();
    if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
    if (Array.isArray(allergies)) patient.allergies = allergies;
    if (Array.isArray(chronicConditions)) patient.chronicConditions = chronicConditions;

    if (req.user.role === 'admin') {
      if (assignedDoctor !== undefined) patient.assignedDoctor = assignedDoctor || null;
      if (typeof isArchived === 'boolean') patient.isArchived = isArchived;
    }

    await patient.save();

    const updated = await Patient.findById(patient._id)
      .populate('user', 'name email phone isActive')
      .populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email' },
      });

    return res.status(200).json({
      success: true,
      message: 'Patient details updated.',
      patient: updated,
    });
  } catch (error) {
    return next(error);
  }
};

export const assignDoctorToPatient = async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    const patient = await Patient.findById(req.params.id).populate('user', 'name');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    if (doctorId) {
      const doctor = await Doctor.findById(doctorId).populate('user', 'name');
      if (!doctor || !doctor.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Active doctor not found.',
        });
      }
      patient.assignedDoctor = doctor._id;
      await patient.save();

      await Promise.all([
        Notification.create({
          recipient: patient.user._id,
          sender: req.user._id,
          title: 'Primary Doctor Assigned',
          message: `Dr. ${doctor.user.name} (${doctor.department}) has been assigned as your doctor.`,
          type: 'general',
        }),
        Notification.create({
          recipient: doctor.user._id,
          sender: req.user._id,
          title: 'New Patient Assigned',
          message: `${patient.user.name} (${patient.patientCode}) has been assigned to your care.`,
          type: 'general',
        }),
      ]);
    } else {
      patient.assignedDoctor = null;
      await patient.save();
    }

    const updated = await Patient.findById(patient._id)
      .populate('user', 'name email phone isActive')
      .populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email' },
      });

    return res.status(200).json({
      success: true,
      message: doctorId ? 'Doctor assigned to patient.' : 'Doctor assignment removed.',
      patient: updated,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteOrArchivePatient = async (req, res, next) => {
  try {
    const { permanent } = req.query;
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    if (permanent === 'true') {
      await User.findByIdAndDelete(patient.user);
      await Patient.findByIdAndDelete(patient._id);
      return res.status(200).json({
        success: true,
        message: 'Patient record permanently deleted.',
      });
    }

    patient.isArchived = !patient.isArchived;
    await patient.save();

    await User.findByIdAndUpdate(patient.user, { isActive: !patient.isArchived });

    return res.status(200).json({
      success: true,
      message: patient.isArchived ? 'Patient archived.' : 'Patient restored from archive.',
      patient,
    });
  } catch (error) {
    return next(error);
  }
};
