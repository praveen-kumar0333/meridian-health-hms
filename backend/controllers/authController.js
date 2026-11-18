import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { getJwtSecret } from '../middleware/authMiddleware.js';
import { generateCode, isValidEmail } from '../utils/validators.js';

const signToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), {
    expiresIn: '7d',
  });
};

const getCookieOptions = (req) => {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
};

const formatAuthUser = (user, profile = null) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  profile,
});

export const register = async (req, res, next) => {
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
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Security: Public registration strictly creates a patient role regardless of request payload.
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'patient',
      phone: phone ? phone.trim() : '',
    });

    const patientProfile = await Patient.create({
      user: user._id,
      patientCode: generateCode('PAT'),
      dateOfBirth: dateOfBirth || null,
      gender: gender || 'Prefer not to say',
      bloodGroup: bloodGroup || 'Unknown',
      address: address ? address.trim() : '',
      emergencyContact: emergencyContact || {},
    });

    await Notification.create({
      recipient: user._id,
      title: 'Welcome to Meridian Health',
      message: 'Your patient portal account has been created. You can now book appointments and view your records.',
      type: 'system',
    });

    const token = signToken(user);
    res.cookie('hms_token', token, getCookieOptions(req));

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: formatAuthUser(user, patientProfile),
    });
  } catch (error) {
    return next(error);
  }
};

const ALLOWED_LOGIN_ROLES = {
  patient: 'Patient',
  doctor: 'Doctor',
  admin: 'Admin',
};

export const login = async (req, res, next) => {
  try {
    const { email, password, selectedRole } = req.body;

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedSelectedRole =
      typeof selectedRole === 'string' && selectedRole.trim()
        ? selectedRole.trim().toLowerCase()
        : null;

    if (normalizedSelectedRole && !ALLOWED_LOGIN_ROLES[normalizedSelectedRole]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid login role selected.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account is currently deactivated. Please contact administration.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (normalizedSelectedRole && user.role !== normalizedSelectedRole) {
      return res.status(403).json({
        success: false,
        message: `This account is not registered as a ${ALLOWED_LOGIN_ROLES[normalizedSelectedRole]}. Please select the correct login option.`,
      });
    }

    let profile = null;
    if (user.role === 'doctor') {
      profile = await Doctor.findOne({ user: user._id });
      if (profile && !profile.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your doctor profile is deactivated. Please contact hospital admin.',
        });
      }
    } else if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id }).populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email phone' },
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);
    res.cookie('hms_token', token, getCookieOptions(req));

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: formatAuthUser(user, profile),
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res) => {
  const options = getCookieOptions(req);
  res.clearCookie('hms_token', {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: '/',
  });

  return res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
};

export const getCurrentUser = async (req, res, next) => {
  try {
    let profile = null;
    if (req.user.role === 'doctor') {
      profile = await Doctor.findOne({ user: req.user._id });
    } else if (req.user.role === 'patient') {
      profile = await Patient.findOne({ user: req.user._id }).populate({
        path: 'assignedDoctor',
        populate: { path: 'user', select: 'name email phone' },
      });
    }

    return res.status(200).json({
      success: true,
      user: formatAuthUser(req.user, profile),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
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
      bio,
      qualification,
      availableDays,
      workingHours,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name && name.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    await user.save();

    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id });
      if (profile) {
        if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth || null;
        if (gender !== undefined) profile.gender = gender;
        if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
        if (address !== undefined) profile.address = String(address).trim();
        if (emergencyContact !== undefined) profile.emergencyContact = emergencyContact;
        if (Array.isArray(allergies)) profile.allergies = allergies;
        if (Array.isArray(chronicConditions)) profile.chronicConditions = chronicConditions;
        await profile.save();
      }
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ user: user._id });
      if (profile) {
        if (bio !== undefined) profile.bio = String(bio).trim();
        if (qualification !== undefined) profile.qualification = String(qualification).trim();
        if (Array.isArray(availableDays)) profile.availableDays = availableDays;
        if (workingHours && workingHours.start && workingHours.end) {
          profile.workingHours = workingHours;
        }
        await profile.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: formatAuthUser(user, profile),
    });
  } catch (error) {
    return next(error);
  }
};

export const getUsersList = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name email role')
      .sort({ role: 1, name: 1 });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return next(error);
  }
};

