import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
    },
    senderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender user is required'],
    },
    senderRole: {
      type: String,
      enum: ['patient', 'doctor'],
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message text cannot be empty'],
      trim: true,
      minlength: [1, 'Message text cannot be empty'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, senderRole: 1, isRead: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
