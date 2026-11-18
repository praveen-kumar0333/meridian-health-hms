import mongoose from 'mongoose';
import BedInventory from '../models/BedInventory.js';
import BedAllocation from '../models/BedAllocation.js';
import EmergencyRequest from '../models/EmergencyRequest.js';
import Patient from '../models/Patient.js';
import { generateCode } from '../utils/validators.js';

const DEMO_BED_DEPARTMENTS = [
  {
    department: 'Emergency Medicine',
    wardName: 'Emergency Trauma & Triage',
    totalBeds: 20,
    occupiedBeds: 11,
    reservedBeds: 2,
    availableBeds: 7,
    isDemoData: true,
    notes: 'Demonstration baseline counts — adjust to match actual ward capacity.',
  },
  {
    department: 'Cardiology',
    wardName: 'Cardiac Care Unit (CCU)',
    totalBeds: 16,
    occupiedBeds: 9,
    reservedBeds: 1,
    availableBeds: 6,
    isDemoData: true,
    notes: 'Demonstration baseline counts — adjust to match actual ward capacity.',
  },
  {
    department: 'General Medicine',
    wardName: 'General Inpatient Ward',
    totalBeds: 36,
    occupiedBeds: 22,
    reservedBeds: 2,
    availableBeds: 12,
    isDemoData: true,
    notes: 'Demonstration baseline counts — adjust to match actual ward capacity.',
  },
  {
    department: 'Orthopedics',
    wardName: 'Orthopedic Recovery Ward',
    totalBeds: 18,
    occupiedBeds: 8,
    reservedBeds: 1,
    availableBeds: 9,
    isDemoData: true,
    notes: 'Demonstration baseline counts — adjust to match actual ward capacity.',
  },
  {
    department: 'Pediatrics',
    wardName: 'Pediatric Inpatient Unit',
    totalBeds: 14,
    occupiedBeds: 6,
    reservedBeds: 0,
    availableBeds: 8,
    isDemoData: true,
    notes: 'Demonstration baseline counts — adjust to match actual ward capacity.',
  },
];

export const getBedDashboard = async (req, res, next) => {
  try {
    const { department = '', status = '' } = req.query;
    const allInventories = await BedInventory.find({}).sort({ department: 1 });

    const summary = allInventories.reduce(
      (acc, item) => {
        acc.totalBeds += item.totalBeds;
        acc.availableBeds += item.availableBeds;
        acc.occupiedBeds += item.occupiedBeds;
        acc.reservedBeds += item.reservedBeds;
        if (item.isDemoData) acc.hasDemoData = true;
        return acc;
      },
      {
        totalBeds: 0,
        availableBeds: 0,
        occupiedBeds: 0,
        reservedBeds: 0,
        occupancyRate: 0,
        hasDemoData: false,
      }
    );

    if (summary.totalBeds > 0) {
      summary.occupancyRate = Math.round(
        ((summary.occupiedBeds + summary.reservedBeds) / summary.totalBeds) * 100
      );
    }

    let filteredInventories = allInventories;
    if (department.trim()) {
      const deptTerm = department.trim().toLowerCase();
      filteredInventories = filteredInventories.filter((inv) =>
        inv.department.toLowerCase().includes(deptTerm)
      );
    }
    if (status === 'available') {
      filteredInventories = filteredInventories.filter((inv) => inv.availableBeds > 0);
    } else if (status === 'full') {
      filteredInventories = filteredInventories.filter((inv) => inv.availableBeds === 0);
    } else if (status === 'reserved') {
      filteredInventories = filteredInventories.filter((inv) => inv.reservedBeds > 0);
    } else if (status === 'occupied') {
      filteredInventories = filteredInventories.filter((inv) => inv.occupiedBeds > 0);
    }

    const allocationQuery = {};
    if (department.trim()) {
      allocationQuery.department = department.trim();
    }
    if (['Reserved', 'Occupied', 'Released'].includes(status)) {
      allocationQuery.status = status;
    }

    const allocations = await BedAllocation.find(allocationQuery)
      .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
      .populate('emergencyRequest', 'requestCode urgencyLevel status')
      .populate('allocatedBy', 'name')
      .populate('releasedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(60);

    return res.status(200).json({
      success: true,
      summary,
      departments: filteredInventories,
      allDepartments: allInventories,
      allocations,
    });
  } catch (error) {
    return next(error);
  }
};

export const upsertBedInventory = async (req, res, next) => {
  try {
    const {
      id,
      department,
      wardName = 'General Ward',
      totalBeds,
      occupiedBeds = 0,
      reservedBeds = 0,
      availableBeds,
      notes = '',
      isDemoData = false,
    } = req.body;

    const deptName = String(department || '').trim();
    if (!deptName && !id) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const total = Number(totalBeds);
    const occupied = Number(occupiedBeds);
    const reserved = Number(reservedBeds);

    if (
      !Number.isInteger(total) ||
      !Number.isInteger(occupied) ||
      !Number.isInteger(reserved)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Total, occupied, and reserved bed counts must be whole integers.',
      });
    }

    if (total < 0 || occupied < 0 || reserved < 0) {
      return res.status(400).json({
        success: false,
        message: 'Bed counts cannot be negative.',
      });
    }

    if (occupied + reserved > total) {
      return res.status(400).json({
        success: false,
        message: 'Occupied and reserved beds cannot exceed total beds.',
      });
    }

    const computedAvailable = total - occupied - reserved;
    if (availableBeds !== undefined && availableBeds !== '') {
      const explicitAvail = Number(availableBeds);
      if (!Number.isInteger(explicitAvail) || explicitAvail < 0) {
        return res.status(400).json({
          success: false,
          message: 'Available beds must be a non-negative integer.',
        });
      }
      if (explicitAvail > total) {
        return res.status(400).json({
          success: false,
          message: 'Available beds cannot exceed total beds.',
        });
      }
      if (explicitAvail !== computedAvailable) {
        return res.status(400).json({
          success: false,
          message: `Bed counts are inconsistent: Available (${explicitAvail}) + Occupied (${occupied}) + Reserved (${reserved}) must equal Total (${total}).`,
        });
      }
    }

    let inventory = null;
    if (id) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid bed inventory ID.' });
      }
      inventory = await BedInventory.findById(id);
      if (!inventory) {
        return res.status(404).json({ success: false, message: 'Bed inventory record not found.' });
      }
    } else {
      inventory = await BedInventory.findOne({ department: deptName });
    }

    if (inventory) {
      if (deptName) inventory.department = deptName;
      inventory.wardName = String(wardName || inventory.wardName || 'General Ward').trim();
      inventory.totalBeds = total;
      inventory.occupiedBeds = occupied;
      inventory.reservedBeds = reserved;
      inventory.availableBeds = computedAvailable;
      inventory.notes = String(notes || '').trim();
      inventory.isDemoData = Boolean(isDemoData);
      inventory.updatedBy = req.user._id;
      await inventory.save();
    } else {
      inventory = await BedInventory.create({
        department: deptName,
        wardName: String(wardName || 'General Ward').trim(),
        totalBeds: total,
        occupiedBeds: occupied,
        reservedBeds: reserved,
        availableBeds: computedAvailable,
        notes: String(notes || '').trim(),
        isDemoData: Boolean(isDemoData),
        updatedBy: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Bed inventory saved for ${inventory.department}.`,
      inventory,
    });
  } catch (error) {
    return next(error);
  }
};

export const createBedAllocation = async (req, res, next) => {
  try {
    const {
      bedInventoryId,
      bedNumber,
      patientId = null,
      patientName = '',
      emergencyRequestId = null,
      allocationType = 'Reserved',
      notes = '',
    } = req.body;

    if (!bedInventoryId || !mongoose.isValidObjectId(bedInventoryId)) {
      return res.status(400).json({ success: false, message: 'Valid department bed inventory is required.' });
    }

    if (!['Reserved', 'Occupied'].includes(allocationType)) {
      return res.status(400).json({ success: false, message: 'Allocation type must be Reserved or Occupied.' });
    }

    const trimmedBedNumber = String(bedNumber || '').trim();
    if (!trimmedBedNumber || trimmedBedNumber.length > 40) {
      return res.status(400).json({ success: false, message: 'Bed number is required (max 40 chars).' });
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
        message: `Bed ${trimmedBedNumber} in ${targetInventory.department} is already ${duplicateBed.status.toLowerCase()}.`,
      });
    }

    let resolvedPatientName = String(patientName || '').trim();
    let resolvedPatientId = null;
    if (patientId) {
      if (!mongoose.isValidObjectId(patientId)) {
        return res.status(400).json({ success: false, message: 'Invalid patient ID.' });
      }
      const pat = await Patient.findById(patientId).populate('user', 'name');
      if (!pat) {
        return res.status(404).json({ success: false, message: 'Selected patient not found.' });
      }
      resolvedPatientId = pat._id;
      if (!resolvedPatientName) {
        resolvedPatientName = pat.user?.name || '';
      }
    }

    let resolvedEmergencyId = null;
    if (emergencyRequestId) {
      if (!mongoose.isValidObjectId(emergencyRequestId)) {
        return res.status(400).json({ success: false, message: 'Invalid emergency request ID.' });
      }
      const existingEmergencyAlloc = await BedAllocation.findOne({
        emergencyRequest: emergencyRequestId,
        status: { $in: ['Reserved', 'Occupied'] },
      });
      if (existingEmergencyAlloc) {
        return res.status(409).json({
          success: false,
          message: 'This emergency request already has an active bed allocation.',
        });
      }
      resolvedEmergencyId = emergencyRequestId;
    }

    const incFields =
      allocationType === 'Occupied'
        ? { availableBeds: -1, occupiedBeds: 1 }
        : { availableBeds: -1, reservedBeds: 1 };

    const updatedInventory = await BedInventory.findOneAndUpdate(
      { _id: bedInventoryId, availableBeds: { $gte: 1 } },
      { $inc: incFields, $set: { updatedBy: req.user._id } },
      { new: true }
    );

    if (!updatedInventory) {
      return res.status(400).json({
        success: false,
        message: `No available beds left in ${targetInventory.department}.`,
      });
    }

    let allocation;
    try {
      allocation = await BedAllocation.create({
        allocationCode: generateCode('BED'),
        bedInventory: updatedInventory._id,
        department: updatedInventory.department,
        bedNumber: trimmedBedNumber,
        patient: resolvedPatientId,
        patientName: resolvedPatientName,
        emergencyRequest: resolvedEmergencyId,
        allocationType,
        status: allocationType,
        notes: String(notes || '').trim(),
        allocatedBy: req.user._id,
      });
    } catch (err) {
      const rollbackInc =
        allocationType === 'Occupied'
          ? { availableBeds: 1, occupiedBeds: -1 }
          : { availableBeds: 1, reservedBeds: -1 };
      await BedInventory.findByIdAndUpdate(updatedInventory._id, { $inc: rollbackInc });
      throw err;
    }

    return res.status(201).json({
      success: true,
      message: `Bed ${trimmedBedNumber} marked as ${allocationType} in ${updatedInventory.department}.`,
      allocation,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAllocationStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid allocation ID.' });
    }

    const { status } = req.body;
    if (!['Occupied', 'Released'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Allocation status can only transition to Occupied or Released.',
      });
    }

    const current = await BedAllocation.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Bed allocation not found.' });
    }

    if (current.status === 'Released') {
      return res.status(409).json({
        success: false,
        message: 'This bed allocation has already been released.',
      });
    }

    if (status === 'Occupied') {
      if (current.status !== 'Reserved') {
        return res.status(400).json({
          success: false,
          message: 'Only reserved beds can be checked in as occupied.',
        });
      }

      const updated = await BedAllocation.findOneAndUpdate(
        { _id: current._id, status: 'Reserved' },
        { $set: { status: 'Occupied' } },
        { new: true }
      );
      if (!updated) {
        return res.status(409).json({ success: false, message: 'Allocation status changed concurrently.' });
      }

      const inv = await BedInventory.findOneAndUpdate(
        { _id: current.bedInventory, reservedBeds: { $gte: 1 } },
        { $inc: { reservedBeds: -1, occupiedBeds: 1 }, $set: { updatedBy: req.user._id } },
        { new: true }
      );
      if (!inv) {
        await BedAllocation.findByIdAndUpdate(current._id, { $set: { status: 'Reserved' } });
        return res.status(409).json({
          success: false,
          message: 'Reserved bed count mismatch; please check department inventory counts.',
        });
      }

      return res.status(200).json({
        success: true,
        message: `Bed ${current.bedNumber} is now occupied.`,
        allocation: updated,
      });
    }

    // Release bed ('Reserved' or 'Occupied' -> 'Released')
    const priorStatus = current.status;
    const released = await BedAllocation.findOneAndUpdate(
      { _id: current._id, status: priorStatus },
      { $set: { status: 'Released', releasedBy: req.user._id, releasedAt: new Date() } },
      { new: true }
    );
    if (!released) {
      return res.status(409).json({ success: false, message: 'Bed was already released.' });
    }

    const filterGuard =
      priorStatus === 'Reserved' ? { reservedBeds: { $gte: 1 } } : { occupiedBeds: { $gte: 1 } };
    const incRelease =
      priorStatus === 'Reserved'
        ? { availableBeds: 1, reservedBeds: -1 }
        : { availableBeds: 1, occupiedBeds: -1 };

    const inv = await BedInventory.findOneAndUpdate(
      { _id: current.bedInventory, ...filterGuard },
      { $inc: incRelease, $set: { updatedBy: req.user._id } },
      { new: true }
    );

    if (!inv) {
      await BedAllocation.findByIdAndUpdate(current._id, {
        $set: { status: priorStatus, releasedBy: null, releasedAt: null },
      });
      return res.status(409).json({
        success: false,
        message: 'Inventory counts could not be decremented consistently.',
      });
    }

    if (current.emergencyRequest) {
      const emg = await EmergencyRequest.findById(current.emergencyRequest);
      if (emg) {
        emg.adminUpdates.push({
          message: `Bed ${current.bedNumber} (${current.department}) was released.`,
          statusAtUpdate: emg.status,
          updatedBy: req.user._id,
          updatedByName: req.user.name,
          createdAt: new Date(),
        });
        await emg.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bed ${current.bedNumber} released back to ${current.department} availability.`,
      allocation: released,
    });
  } catch (error) {
    return next(error);
  }
};

export const seedDemoBeds = async (req, res, next) => {
  try {
    const existingCount = await BedInventory.countDocuments({});
    if (existingCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bed inventory already exists. Demonstration counts can only be initialized on an empty inventory.',
      });
    }

    const docs = DEMO_BED_DEPARTMENTS.map((entry) => ({
      ...entry,
      updatedBy: req.user._id,
    }));
    const created = await BedInventory.insertMany(docs);

    return res.status(201).json({
      success: true,
      message: 'Demonstration bed counts loaded. Update values anytime to reflect live ward capacity.',
      departments: created,
    });
  } catch (error) {
    return next(error);
  }
};
