import mongoose from 'mongoose';

const bedAllocationSchema = new mongoose.Schema(
  {
    allocationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    bedInventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedInventory',
      required: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    bedNumber: {
      type: String,
      required: [true, 'Bed identifier is required'],
      trim: true,
      maxlength: 40,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    patientName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    emergencyRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      default: null,
    },
    allocationType: {
      type: String,
      enum: ['Reserved', 'Occupied'],
      default: 'Reserved',
    },
    status: {
      type: String,
      enum: ['Reserved', 'Occupied', 'Released'],
      default: 'Reserved',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 400,
      default: '',
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bedAllocationSchema.index({ bedInventory: 1, status: 1, createdAt: -1 });
bedAllocationSchema.index({ emergencyRequest: 1 });
bedAllocationSchema.index({ department: 1, bedNumber: 1, status: 1 });

const BedAllocation =
  mongoose.models.BedAllocation || mongoose.model('BedAllocation', bedAllocationSchema);

export default BedAllocation;
