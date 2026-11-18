import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import {
  HOSPITAL_DEPARTMENTS,
  generateCode,
  isValidEmail,
} from '../utils/validators.js';

export const getDepartments = async (req, res, next) => {
  try {
    const activeDoctors = await Doctor.find({ isActive: true }).select('department');
    const counts = {};
    HOSPITAL_DEPARTMENTS.forEach((dept) => {
      counts[dept] = 0;
    });
    activeDoctors.forEach((doc) => {
      counts[doc.department] = (counts[doc.department] || 0) + 1;
    });

    const departments = Object.keys(counts)
      .sort()
      .map((name) => ({
        name,
        activeDoctors: counts[name],
      }));

    return res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    return next(error);
  }
};

export const getDoctors = async (req, res, next) => {
  try {
    const { department = '', search = '', includeInactive = 'false' } = req.query;
    const query = {};

    if (req.user.role !== 'admin' || includeInactive !== 'true') {
      query.isActive = true;
    }
    if (department.trim()) {
      query.department = department.trim();
    }

    let doctors = await Doctor.find(query)
      .populate('user', 'name email phone isActive createdAt')
      .sort({ department: 1, createdAt: -1 });

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      doctors = doctors.filter(
        (d) =>
          d.user?.name?.toLowerCase().includes(term) ||
          d.user?.email?.toLowerCase().includes(term) ||
          d.department?.toLowerCase().includes(term) ||
          d.specialization?.toLowerCase().includes(term) ||
          d.employeeId?.toLowerCase().includes(term)
      );
    }

    return res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    return next(error);
  }
};

export const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      'user',
      'name email phone isActive'
    );
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
    return res.status(200).json({ success: true, doctor });
  } catch (error) {
    return next(error);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      department,
      specialization,
      qualification,
      experienceYears,
      consultationFee,
      availableDays,
      workingHours,
      bio,
    } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Doctor full name must be at least 2 characters.',
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Initial password must be at least 6 characters long.',
      });
    }
    if (!department || !String(department).trim() || !specialization || !String(specialization).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department and specialization are required.',
      });
    }

    const parsedExp =
      experienceYears !== undefined && experienceYears !== '' ? Number(experienceYears) : 0;
    const parsedFee =
      consultationFee !== undefined && consultationFee !== '' ? Number(consultationFee) : 100;

    if (Number.isNaN(parsedExp) || parsedExp < 0) {
      return res.status(400).json({
        success: false,
        message: 'Experience years cannot be negative.',
      });
    }
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      return res.status(400).json({
        success: false,
        message: 'Consultation fee cannot be negative.',
      });
    }

    const trimmedBio = bio ? String(bio).trim() : '';
    if (trimmedBio.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Bio cannot exceed 500 characters.',
      });
    }

    const resolvedWorkingHours =
      workingHours && workingHours.start && workingHours.end
        ? { start: String(workingHours.start), end: String(workingHours.end) }
        : { start: '09:00', end: '17:00' };

    if (resolvedWorkingHours.start >= resolvedWorkingHours.end) {
      return res.status(400).json({
        success: false,
        message: 'Shift end time must be after shift start time.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'doctor',
      phone: phone ? String(phone).trim() : '',
    });

    let doctor;
    try {
      doctor = await Doctor.create({
        user: user._id,
        employeeId: generateCode('DOC'),
        department: String(department).trim(),
        specialization: String(specialization).trim(),
        qualification: qualification ? String(qualification).trim() : 'MBBS, MD',
        experienceYears: parsedExp,
        consultationFee: parsedFee,
        availableDays:
          Array.isArray(availableDays) && availableDays.length > 0
            ? availableDays
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: resolvedWorkingHours,
        bio: trimmedBio,
      });
    } catch (docError) {
      await User.findByIdAndDelete(user._id).catch(() => {});
      throw docError;
    }

    const populated = await Doctor.findById(doctor._id).populate(
      'user',
      'name email phone isActive'
    );

    return res.status(201).json({
      success: true,
      message: 'Doctor added successfully.',
      doctor: populated,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    if (req.user.role === 'doctor') {
      if (!req.doctorProfile || String(req.doctorProfile._id) !== String(doctor._id)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const {
      name,
      phone,
      department,
      specialization,
      qualification,
      experienceYears,
      consultationFee,
      availableDays,
      workingHours,
      bio,
    } = req.body;

    const user = await User.findById(doctor.user);
    if (user) {
      if (name && name.trim()) user.name = name.trim();
      if (phone !== undefined) user.phone = String(phone).trim();
      await user.save();
    }

    if (req.user.role === 'admin') {
      if (department) doctor.department = department.trim();
      if (specialization) doctor.specialization = specialization.trim();
      if (experienceYears !== undefined) doctor.experienceYears = Number(experienceYears);
      if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    }

    if (qualification !== undefined) doctor.qualification = String(qualification).trim();
    if (Array.isArray(availableDays)) doctor.availableDays = availableDays;
    if (workingHours && workingHours.start && workingHours.end) {
      doctor.workingHours = workingHours;
    }
    if (bio !== undefined) doctor.bio = String(bio).trim();

    await doctor.save();

    const updated = await Doctor.findById(doctor._id).populate(
      'user',
      'name email phone isActive'
    );

    return res.status(200).json({
      success: true,
      message: 'Doctor details updated.',
      doctor: updated,
    });
  } catch (error) {
    return next(error);
  }
};

export const toggleDoctorStatus = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    doctor.isActive = !doctor.isActive;
    await doctor.save();

    await User.findByIdAndUpdate(doctor.user, { isActive: doctor.isActive });

    const updated = await Doctor.findById(doctor._id).populate(
      'user',
      'name email phone isActive'
    );

    return res.status(200).json({
      success: true,
      message: doctor.isActive ? 'Doctor activated.' : 'Doctor deactivated.',
      doctor: updated,
    });
  } catch (error) {
    return next(error);
  }
};
