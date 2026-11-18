import express from 'express';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  assignDoctorToPatient,
  deleteOrArchivePatient,
} from '../controllers/patientController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'doctor'), getPatients);
router.get('/:id', protect, authorizeRoles('admin', 'doctor', 'patient'), getPatientById);
router.post('/', protect, authorizeRoles('admin'), createPatient);
router.put('/:id', protect, authorizeRoles('admin', 'patient'), updatePatient);
router.patch('/:id/assign-doctor', protect, authorizeRoles('admin'), assignDoctorToPatient);
router.delete('/:id', protect, authorizeRoles('admin'), deleteOrArchivePatient);

export default router;
