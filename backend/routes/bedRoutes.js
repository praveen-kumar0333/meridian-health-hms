import express from 'express';
import {
  createBedAllocation,
  getBedDashboard,
  seedDemoBeds,
  updateAllocationStatus,
  upsertBedInventory,
} from '../controllers/bedController.js';
import { authorizeRoles, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/', getBedDashboard);
router.post('/', upsertBedInventory);
router.post('/seed-demo', seedDemoBeds);
router.post('/allocations', createBedAllocation);
router.patch('/allocations/:id/status', updateAllocationStatus);

export default router;
