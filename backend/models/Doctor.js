import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
      default: 'MBBS, MD',
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience cannot be negative'],
      default: 0,
    },
    consultationFee: {
      type: Number,
      min: [0, 'Consultation fee cannot be negative'],
      default: 100,
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

doctorSchema.index({ department: 1, isActive: 1 });
doctorSchema.index({ specialization: 1 });

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
export default Doctor;
