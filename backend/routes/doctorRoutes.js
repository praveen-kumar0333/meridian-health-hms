import express from 'express';
import {
  getDepartments,
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  toggleDoctorStatus,
} from '../controllers/doctorController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/departments', protect, getDepartments);
router.get('/', protect, getDoctors);
router.get('/:id', protect, getDoctorById);
router.post('/', protect, authorizeRoles('admin'), createDoctor);
router.put('/:id', protect, authorizeRoles('admin', 'doctor'), updateDoctor);
router.patch('/:id/status', protect, authorizeRoles('admin'), toggleDoctorStatus);

export default router;
