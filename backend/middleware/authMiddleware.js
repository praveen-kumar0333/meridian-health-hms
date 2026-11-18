import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { getDbStatus } from '../config/db.js';

const parseCookies = (cookieHeader = '') => {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  });
  return cookies;
};

export const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'hms_dev_fallback_secret_change_in_env';
};

export const requireDbConnection = (req, res, next) => {
  const status = getDbStatus();
  if (!status.isConnected) {
    return res.status(503).json({
      success: false,
      code: 'DB_UNAVAILABLE',
      message: 'Database is not connected yet. Please configure MONGO_URI and restart.',
    });
  }
  return next();
};

export const protect = async (req, res, next) => {
  try {
    const status = getDbStatus();
    if (!status.isConnected) {
      return res.status(503).json({
        success: false,
        code: 'DB_UNAVAILABLE',
        message: 'Database is not connected yet.',
      });
    }

    let token = null;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      const bearerVal = req.headers.authorization.split(' ')[1];
      if (bearerVal && bearerVal !== 'null' && bearerVal !== 'undefined') {
        token = bearerVal;
      }
    }
    if (!token) {
      const cookies = parseCookies(req.headers.cookie);
      if (cookies.hms_token) {
        token = cookies.hms_token;
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact hospital administration.',
      });
    }

    req.user = user;

    if (user.role === 'doctor') {
      req.doctorProfile = await Doctor.findOne({ user: user._id });
    } else if (user.role === 'patient') {
      req.patientProfile = await Patient.findOne({ user: user._id });
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please sign in again.',
    });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    return next();
  };
};
