import express from 'express';
import {
  allocateEmergencyBed,
  createEmergencyRequest,
  getEmergencyRequestById,
  getEmergencyRequests,
  updateEmergencyRequest,
} from '../controllers/emergencyController.js';
import { authorizeRoles, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', authorizeRoles('patient', 'admin'), getEmergencyRequests);
router.post('/', authorizeRoles('patient'), createEmergencyRequest);
router.get('/:id', authorizeRoles('patient', 'admin'), getEmergencyRequestById);
router.patch('/:id', authorizeRoles('admin'), updateEmergencyRequest);
router.post('/:id/allocate-bed', authorizeRoles('admin'), allocateEmergencyBed);

export default router;
