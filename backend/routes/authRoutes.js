import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  getUsersList,
} from '../controllers/authController.js';
import {
  protect,
  authorizeRoles,
  requireDbConnection,
} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', requireDbConnection, register);
router.post('/login', requireDbConnection, login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, authorizeRoles('admin'), getUsersList);

export default router;
