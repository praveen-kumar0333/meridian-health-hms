import express from 'express';
import {
  getDoctorAvailability,
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  updateAppointmentDetails,
} from '../controllers/appointmentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/availability', protect, getDoctorAvailability);
router.get('/', protect, authorizeRoles('admin', 'doctor', 'patient'), getAppointments);
router.post('/', protect, authorizeRoles('admin', 'patient'), createAppointment);
router.patch('/:id/status', protect, authorizeRoles('admin', 'doctor', 'patient'), updateAppointmentStatus);
router.put('/:id', protect, authorizeRoles('admin'), updateAppointmentDetails);

export default router;
