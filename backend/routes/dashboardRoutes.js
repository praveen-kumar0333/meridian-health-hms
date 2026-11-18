import express from 'express';
import {
  getAdminDashboard,
  getDoctorDashboard,
  getPatientDashboard,
} from '../controllers/dashboardController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/admin', protect, authorizeRoles('admin'), getAdminDashboard);
router.get('/doctor', protect, authorizeRoles('doctor'), getDoctorDashboard);
router.get('/patient', protect, authorizeRoles('patient'), getPatientDashboard);

export default router;
