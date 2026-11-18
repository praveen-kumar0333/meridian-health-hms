import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient profile is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor profile is required'],
    },
    lastMessageText: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastSenderRole: {
      type: String,
      enum: ['patient', 'doctor', ''],
      default: '',
    },
    unreadForPatient: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadForDoctor: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ patient: 1, doctor: 1 }, { unique: true });
conversationSchema.index({ doctor: 1, lastMessageAt: -1 });

const Conversation =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export default Conversation;
