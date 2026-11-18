import mongoose from 'mongoose';

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const medicalRecordSchema = new mongoose.Schema(
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
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    visitDate: {
      type: Date,
      default: Date.now,
    },
    symptoms: {
      type: String,
      trim: true,
      default: '',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
    vitals: {
      bloodPressure: { type: String, trim: true, default: '' },
      heartRate: { type: String, trim: true, default: '' },
      temperature: { type: String, trim: true, default: '' },
      weight: { type: String, trim: true, default: '' },
    },
    prescriptions: {
      type: [prescriptionItemSchema],
      default: [],
    },
    followUpDate: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });

const MedicalRecord =
  mongoose.models.MedicalRecord || mongoose.model('MedicalRecord', medicalRecordSchema);
export default MedicalRecord;
