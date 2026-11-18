import express from 'express';
import {
  getConversations,
  getMessages,
  getUnreadChatCount,
  sendMessage,
} from '../controllers/chatController.js';
import { authorizeRoles, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('patient', 'doctor'));

router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadChatCount);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/messages', sendMessage);

export default router;
