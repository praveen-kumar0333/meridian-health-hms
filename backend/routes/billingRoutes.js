import express from 'express';
import {
  getInvoices,
  getRevenueAnalytics,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from '../controllers/billingController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'patient'), getInvoices);
router.get('/analytics', protect, authorizeRoles('admin'), getRevenueAnalytics);
router.post('/', protect, authorizeRoles('admin'), createInvoice);
router.patch('/:id/status', protect, authorizeRoles('admin'), updateInvoiceStatus);
router.delete('/:id', protect, authorizeRoles('admin'), deleteInvoice);

export default router;
