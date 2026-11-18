import express from 'express';
import {
  getMedicalRecords,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
} from '../controllers/medicalRecordController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'doctor', 'patient'), getMedicalRecords);
router.post('/', protect, authorizeRoles('admin', 'doctor'), createMedicalRecord);
router.put('/:id', protect, authorizeRoles('admin', 'doctor'), updateMedicalRecord);
router.delete('/:id', protect, authorizeRoles('admin'), deleteMedicalRecord);

export default router;
