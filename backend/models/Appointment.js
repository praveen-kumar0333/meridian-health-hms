import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    appointmentDate: {
      type: String,
      required: [true, 'Appointment date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^\d{2}:\d{2}$/, 'Start time must use HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^\d{2}:\d{2}$/, 'End time must use HH:mm format'],
    },
    startMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
    },
    endMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 1440,
    },
    reason: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true,
      maxlength: 400,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    rescheduleRequested: {
      type: Boolean,
      default: false,
    },
    rescheduleNote: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ doctor: 1, appointmentDate: 1, startMinutes: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
export default Appointment;
