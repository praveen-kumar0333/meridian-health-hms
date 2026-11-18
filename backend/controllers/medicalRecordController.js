import MedicalRecord from '../models/MedicalRecord.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';

const doctorCanAccessPatient = async (doctorProfile, patientId) => {
  if (!doctorProfile) return false;
  const patient = await Patient.findById(patientId);
  if (!patient) return false;
  if (
    patient.assignedDoctor &&
    String(patient.assignedDoctor) === String(doctorProfile._id)
  ) {
    return true;
  }
  const hasAppt = await Appointment.exists({
    doctor: doctorProfile._id,
    patient: patientId,
  });
  return Boolean(hasAppt);
};

export const getMedicalRecords = async (req, res, next) => {
  try {
    const { patientId = '', search = '' } = req.query;
    const query = {};

    if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      query.patient = req.patientProfile._id;
    } else if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }
      if (patientId) {
        const allowed = await doctorCanAccessPatient(req.doctorProfile, patientId);
        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to view records for this patient.',
          });
        }
        query.patient = patientId;
      } else {
        const [assignedIds, apptIds] = await Promise.all([
          Patient.distinct('_id', { assignedDoctor: req.doctorProfile._id }),
          Appointment.distinct('patient', { doctor: req.doctorProfile._id }),
        ]);
        const authorizedPatientIds = [...new Set([...assignedIds, ...apptIds])];
        query.$or = [
          { doctor: req.doctorProfile._id },
          { patient: { $in: authorizedPatientIds } },
        ];
      }
    } else if (req.user.role === 'admin' && patientId) {
      query.patient = patientId;
    }

    let records = await MedicalRecord.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email' } })
      .populate('appointment', 'appointmentDate startTime department')
      .sort({ visitDate: -1, createdAt: -1 });

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          r.diagnosis?.toLowerCase().includes(term) ||
          r.symptoms?.toLowerCase().includes(term) ||
          r.patient?.user?.name?.toLowerCase().includes(term) ||
          r.doctor?.user?.name?.toLowerCase().includes(term)
      );
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    return next(error);
  }
};

export const createMedicalRecord = async (req, res, next) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentId,
      symptoms,
      diagnosis,
      clinicalNotes,
      vitals,
      prescriptions,
      followUpDate,
    } = req.body;

    if (!patientId || !diagnosis || !diagnosis.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Patient and diagnosis are required.',
      });
    }

    let targetDoctorId = doctorId;
    if (req.user.role === 'doctor') {
      if (!req.doctorProfile) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      }
      const allowed = await doctorCanAccessPatient(req.doctorProfile, patientId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'You can only create records for your assigned or scheduled patients.',
        });
      }
      targetDoctorId = req.doctorProfile._id;
    }

    if (!targetDoctorId) {
      return res.status(400).json({ success: false, message: 'Doctor is required.' });
    }

    const [patient, doctor] = await Promise.all([
      Patient.findById(patientId).populate('user', 'name'),
      Doctor.findById(targetDoctorId).populate('user', 'name'),
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const cleanPrescriptions = Array.isArray(prescriptions)
      ? prescriptions.filter(
          (item) => item && item.medicineName && item.dosage && item.frequency && item.duration
        )
      : [];

    const record = await MedicalRecord.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointmentId || null,
      symptoms: symptoms ? symptoms.trim() : '',
      diagnosis: diagnosis.trim(),
      clinicalNotes: clinicalNotes ? clinicalNotes.trim() : '',
      vitals: vitals || {},
      prescriptions: cleanPrescriptions,
      followUpDate: followUpDate ? followUpDate.trim() : '',
    });

    await Notification.create({
      recipient: patient.user._id,
      sender: req.user._id,
      title: 'New Medical Record Added',
      message: `Dr. ${doctor.user.name} added a clinical record and prescription for diagnosis: ${diagnosis.trim()}.`,
      type: 'medical_record',
      relatedId: record._id,
    });

    const populated = await MedicalRecord.findById(record._id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email' } });

    return res.status(201).json({
      success: true,
      message: 'Medical record saved successfully.',
      record: populated,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateMedicalRecord = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Medical record not found.' });
    }

    if (req.user.role === 'doctor') {
      if (!req.doctorProfile || String(record.doctor) !== String(req.doctorProfile._id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit medical records you authored.',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { symptoms, diagnosis, clinicalNotes, vitals, prescriptions, followUpDate } = req.body;

    if (symptoms !== undefined) record.symptoms = String(symptoms).trim();
    if (diagnosis && diagnosis.trim()) record.diagnosis = diagnosis.trim();
    if (clinicalNotes !== undefined) record.clinicalNotes = String(clinicalNotes).trim();
    if (vitals !== undefined) record.vitals = vitals;
    if (Array.isArray(prescriptions)) {
      record.prescriptions = prescriptions.filter(
        (item) => item && item.medicineName && item.dosage && item.frequency && item.duration
      );
    }
    if (followUpDate !== undefined) record.followUpDate = String(followUpDate).trim();

    await record.save();

    const updated = await MedicalRecord.findById(record._id)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
      .populate({ path: 'doctor', populate: { path: 'user', select: 'name email' } });

    return res.status(200).json({
      success: true,
      message: 'Medical record updated.',
      record: updated,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteMedicalRecord = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Medical record not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Medical record deleted.',
    });
  } catch (error) {
    return next(error);
  }
};
