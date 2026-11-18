import mongoose from 'mongoose';

export const EMERGENCY_CATEGORIES = [
  'Cardiac / Chest Pain',
  'Breathing Difficulty',
  'Trauma / Injury',
  'Neurological / Stroke Symptoms',
  'High Fever / Infection',
  'Obstetric Emergency',
  'Severe Pain / Acute Illness',
  'Other Medical Emergency',
];

export const EMERGENCY_URGENCY_LEVELS = ['Critical', 'High', 'Moderate'];

export const EMERGENCY_STATUSES = [
  'New',
  'Acknowledged',
  'Ambulance Arranged',
  'Bed Reserved',
  'Completed',
  'Cancelled',
];

const adminUpdateSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    statusAtUpdate: {
      type: String,
      enum: EMERGENCY_STATUSES,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedByName: {
      type: String,
      trim: true,
      default: 'Administrator',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const emergencyRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient profile is required'],
    },
    patientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient user is required'],
    },
    category: {
      type: String,
      enum: EMERGENCY_CATEGORIES,
      required: [true, 'Emergency category is required'],
    },
    urgencyLevel: {
      type: String,
      enum: EMERGENCY_URGENCY_LEVELS,
      required: [true, 'Urgency level is required'],
      default: 'High',
    },
    description: {
      type: String,
      required: [true, 'Emergency description is required'],
      trim: true,
      minlength: [5, 'Please provide at least 5 characters describing the emergency'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      maxlength: 40,
    },
    location: {
      type: String,
      required: [true, 'Current location or hospital destination is required'],
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: EMERGENCY_STATUSES,
      default: 'New',
    },
    ambulanceArrangement: {
      arranged: { type: Boolean, default: false },
      providerOrUnit: { type: String, trim: true, maxlength: 140, default: '' },
      driverOrContactPhone: { type: String, trim: true, maxlength: 40, default: '' },
      dispatchNotes: { type: String, trim: true, maxlength: 400, default: '' },
      arrangedAt: { type: Date, default: null },
      arrangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    bedAllocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedAllocation',
      default: null,
    },
    allocatedDepartment: {
      type: String,
      trim: true,
      default: '',
    },
    allocatedBedNumber: {
      type: String,
      trim: true,
      default: '',
    },
    adminUpdates: {
      type: [adminUpdateSchema],
      default: [],
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

emergencyRequestSchema.index({ patient: 1, createdAt: -1 });
emergencyRequestSchema.index({ status: 1, urgencyLevel: 1, createdAt: -1 });

const EmergencyRequest =
  mongoose.models.EmergencyRequest ||
  mongoose.model('EmergencyRequest', emergencyRequestSchema);

export default EmergencyRequest;
