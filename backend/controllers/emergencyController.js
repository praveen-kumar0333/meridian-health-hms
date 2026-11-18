import mongoose from 'mongoose';
import EmergencyRequest, {
  EMERGENCY_CATEGORIES,
  EMERGENCY_STATUSES,
  EMERGENCY_URGENCY_LEVELS,
} from '../models/EmergencyRequest.js';
import BedInventory from '../models/BedInventory.js';
import BedAllocation from '../models/BedAllocation.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { generateCode } from '../utils/validators.js';

const populateEmergency = (query) =>
  query
    .populate({
      path: 'patient',
      populate: { path: 'user', select: 'name email phone' },
    })
    .populate('bedAllocation', 'allocationCode department bedNumber status allocatedAt releasedAt')
    .populate('acknowledgedBy', 'name role');

export const createEmergencyRequest = async (req, res, next) => {
  try {
    if (!req.patientProfile) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const { category, urgencyLevel = 'High', description, contactPhone, location } = req.body;

    if (!EMERGENCY_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid emergency category.',
      });
    }

    if (!EMERGENCY_URGENCY_LEVELS.includes(urgencyLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid urgency level.',
      });
    }

    const trimmedDesc = String(description || '').trim();
    if (trimmedDesc.length < 5 || trimmedDesc.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Emergency description must be between 5 and 1000 characters.',
      });
    }

    const resolvedPhone = String(contactPhone || req.user.phone || '').trim();
    if (!resolvedPhone) {
      return res.status(400).json({
        success: false,
        message: 'A contact phone number is required.',
      });
    }

    const trimmedLocation = String(location || '').trim();
    if (!trimmedLocation || trimmedLocation.length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current location or hospital destination (max 300 characters).',
      });
    }

    const request = await EmergencyRequest.create({
      requestCode: generateCode('EMG'),
      patient: req.patientProfile._id,
      patientUser: req.user._id,
      category,
      urgencyLevel,
      description: trimmedDesc,
      contactPhone: resolvedPhone,
      location: trimmedLocation,
      status: 'New',
      submittedAt: new Date(),
    });

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    if (admins.length > 0) {
      await Notification.insertMany(
        admins.map((admin) => ({
          recipient: admin._id,
          sender: req.user._id,
          title: `Emergency Request ${request.requestCode} (${urgencyLevel})`,
          message: `${req.user.name} (${req.patientProfile.patientCode || 'Patient'}) reported ${category} at ${trimmedLocation}.`,
          type: 'emergency',
          relatedId: request._id,
        }))
      );
    }

    const populated = await populateEmergency(EmergencyRequest.findById(request._id));

    return res.status(201).json({
      success: true,
      message: 'Emergency assistance request submitted.',
      request: populated,
    });
  } catch (error) {
    return next(error);
  }
};

export const getEmergencyRequests = async (req, res, next) => {
  try {
    const { status = '', urgency = '', search = '' } = req.query;
    const query = {};

    if (req.user.role === 'patient') {
      if (!req.patientProfile) {
        return res.status(404).json({ success: false, message: 'Patient profile not found.' });
      }
      query.patient = req.patientProfile._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access emergency requests.',
      });
    }

    if (status && EMERGENCY_STATUSES.includes(status.trim())) {
      query.status = status.trim();
    }
    if (urgency && EMERGENCY_URGENCY_LEVELS.includes(urgency.trim())) {
      query.urgencyLevel = urgency.trim();
    }

    let requests = await populateEmergency(
      EmergencyRequest.find(query).sort({ createdAt: -1 })
    );

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      requests = requests.filter(
        (r) =>
          r.requestCode?.toLowerCase().includes(term) ||
          r.patient?.user?.name?.toLowerCase().includes(term) ||
          r.patient?.patientCode?.toLowerCase().includes(term) ||
          r.category?.toLowerCase().includes(term) ||
          r.location?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term)
      );
    }

    const baseFilter = req.user.role === 'patient' ? { patient: req.patientProfile._id } : {};
    const allForCounts = await EmergencyRequest.find(baseFilter).select('status');
    const summary = {
      total: allForCounts.length,
      newCount: 0,
      acknowledgedCount: 0,
      ambulanceArrangedCount: 0,
      bedReservedCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    };

    allForCounts.forEach((item) => {
      if (item.status === 'New') summary.newCount += 1;
      else if (item.status === 'Acknowledged') summary.acknowledgedCount += 1;
      else if (item.status === 'Ambulance Arranged') summary.ambulanceArrangedCount += 1;
      else if (item.status === 'Bed Reserved') summary.bedReservedCount += 1;
      else if (item.status === 'Completed') summary.completedCount += 1;
      else if (item.status === 'Cancelled') summary.cancelledCount += 1;
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      summary,
      requests,
    });
  } catch (error) {
    return next(error);
  }
};

export const getEmergencyRequestById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency request ID.' });
    }

    const request = await populateEmergency(EmergencyRequest.findById(req.params.id));
    if (!request) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    if (req.user.role === 'patient') {
      if (!req.patientProfile || String(request.patient._id) !== String(req.patientProfile._id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this emergency request.',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateEmergencyRequest = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency request ID.' });
    }

    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    const { status, adminNote, ambulanceArrangement } = req.body;
    const changes = [];

    if (status !== undefined) {
      if (!EMERGENCY_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid emergency status specified.',
        });
      }
      if (status !== request.status) {
        request.status = status;
        changes.push(`Status changed to ${status}`);
      }
      if (status !== 'New' && !request.acknowledgedAt) {
        request.acknowledgedBy = req.user._id;
        request.acknowledgedAt = new Date();
      }
    }

    if (ambulanceArrangement && typeof ambulanceArrangement === 'object') {
      const arranged = Boolean(ambulanceArrangement.arranged);
      const providerOrUnit = String(ambulanceArrangement.providerOrUnit || '').trim();
      const driverOrContactPhone = String(ambulanceArrangement.driverOrContactPhone || '').trim();
      const dispatchNotes = String(ambulanceArrangement.dispatchNotes || '').trim();

      if (arranged && !providerOrUnit && !driverOrContactPhone) {
        return res.status(400).json({
          success: false,
          message: 'Provide ambulance unit/provider or contact phone when recording an arrangement.',
        });
      }

      request.ambulanceArrangement = {
        arranged,
        providerOrUnit,
        driverOrContactPhone,
        dispatchNotes,
        arrangedAt: arranged ? request.ambulanceArrangement?.arrangedAt || new Date() : null,
        arrangedBy: arranged ? req.user._id : null,
      };

      if (arranged) {
        changes.push(
          `Ambulance arrangement recorded${providerOrUnit ? ` (${providerOrUnit})` : ''}`
        );
        if (request.status === 'New' || request.status === 'Acknowledged') {
          request.status = 'Ambulance Arranged';
        }
      }
    }

    const trimmedNote = String(adminNote || '').trim();
    if (trimmedNote.length > 600) {
      return res.status(400).json({
        success: false,
        message: 'Administrative update note cannot exceed 600 characters.',
      });
    }

    if (!trimmedNote && changes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a status change, ambulance arrangement, or update note.',
      });
    }

    const updateMessage = trimmedNote || changes.join(' · ');
    request.adminUpdates.push({
      message: updateMessage,
      statusAtUpdate: request.status,
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      createdAt: new Date(),
    });

    await request.save();

    await Notification.create({
      recipient: request.patientUser,
      sender: req.user._id,
      title: `Emergency Update — ${request.requestCode}`,
      message: `Status: ${request.status}. ${updateMessage}`,
      type: 'emergency',
      relatedId: request._id,
    });

    const populated = await populateEmergency(EmergencyRequest.findById(request._id));

    return res.status(200).json({
      success: true,
      message: 'Emergency request updated.',
      request: populated,
    });
  } catch (error) {
    return next(error);
  }
};

export const allocateEmergencyBed = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency request ID.' });
    }

    const { bedInventoryId, bedNumber, notes = '' } = req.body;
    if (!bedInventoryId || !mongoose.isValidObjectId(bedInventoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid department bed inventory.',
      });
    }

    const trimmedBedNumber = String(bedNumber || '').trim();
    if (!trimmedBedNumber || trimmedBedNumber.length > 40) {
      return res.status(400).json({
        success: false,
        message: 'Bed number/identifier is required (max 40 characters).',
      });
    }

    const request = await EmergencyRequest.findById(req.params.id).populate({
      path: 'patient',
      populate: { path: 'user', select: 'name' },
    });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    if (request.status === 'Cancelled' || request.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot reserve a bed for a ${request.status.toLowerCase()} emergency request.`,
      });
    }

    const existingForRequest = await BedAllocation.findOne({
      emergencyRequest: request._id,
      status: { $in: ['Reserved', 'Occupied'] },
    });
    if (existingForRequest) {
      return res.status(409).json({
        success: false,
        message: `Bed ${existingForRequest.bedNumber} (${existingForRequest.department}) is already reserved for this emergency request.`,
      });
    }

    const targetInventory = await BedInventory.findById(bedInventoryId);
    if (!targetInventory) {
      return res.status(404).json({ success: false, message: 'Department bed inventory not found.' });
    }

    const duplicateBed = await BedAllocation.findOne({
      department: targetInventory.department,
      bedNumber: trimmedBedNumber,
      status: { $in: ['Reserved', 'Occupied'] },
    });
    if (duplicateBed) {
      return res.status(409).json({
        success: false,
        message: `Bed ${trimmedBedNumber} in ${targetInventory.department} is currently ${duplicateBed.status.toLowerCase()}.`,
      });
    }

    const updatedInventory = await BedInventory.findOneAndUpdate(
      { _id: bedInventoryId, availableBeds: { $gte: 1 } },
      { $inc: { availableBeds: -1, reservedBeds: 1 }, $set: { updatedBy: req.user._id } },
      { new: true }
    );

    if (!updatedInventory) {
      return res.status(400).json({
        success: false,
        message: `No available beds remaining in ${targetInventory.department}.`,
      });
    }

    let allocation;
    try {
      allocation = await BedAllocation.create({
        allocationCode: generateCode('BED'),
        bedInventory: updatedInventory._id,
        department: updatedInventory.department,
        bedNumber: trimmedBedNumber,
        patient: request.patient._id,
        patientName: request.patient?.user?.name || '',
        emergencyRequest: request._id,
        allocationType: 'Reserved',
        status: 'Reserved',
        notes: String(notes || '').trim(),
        allocatedBy: req.user._id,
      });
    } catch (allocError) {
      await BedInventory.findByIdAndUpdate(updatedInventory._id, {
        $inc: { availableBeds: 1, reservedBeds: -1 },
      });
      throw allocError;
    }

    request.bedAllocation = allocation._id;
    request.allocatedDepartment = updatedInventory.department;
    request.allocatedBedNumber = trimmedBedNumber;
    request.status = 'Bed Reserved';
    if (!request.acknowledgedAt) {
      request.acknowledgedBy = req.user._id;
      request.acknowledgedAt = new Date();
    }
    request.adminUpdates.push({
      message: `Bed ${trimmedBedNumber} reserved in ${updatedInventory.department}.`,
      statusAtUpdate: 'Bed Reserved',
      updatedBy: req.user._id,
      updatedByName: req.user.name,
      createdAt: new Date(),
    });
    await request.save();

    await Notification.create({
      recipient: request.patientUser,
      sender: req.user._id,
      title: `Bed Reserved — ${request.requestCode}`,
      message: `Bed ${trimmedBedNumber} in ${updatedInventory.department} has been reserved for your emergency request.`,
      type: 'emergency',
      relatedId: request._id,
    });

    const populated = await populateEmergency(EmergencyRequest.findById(request._id));

    return res.status(200).json({
      success: true,
      message: `Bed ${trimmedBedNumber} reserved in ${updatedInventory.department}.`,
      request: populated,
      allocation,
    });
  } catch (error) {
    return next(error);
  }
};
