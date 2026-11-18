import mongoose from 'mongoose';

const bedInventorySchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    wardName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'General Ward',
    },
    totalBeds: {
      type: Number,
      required: [true, 'Total beds count is required'],
      min: [0, 'Total beds cannot be negative'],
    },
    availableBeds: {
      type: Number,
      required: true,
      min: [0, 'Available beds cannot be negative'],
    },
    occupiedBeds: {
      type: Number,
      required: true,
      min: [0, 'Occupied beds cannot be negative'],
      default: 0,
    },
    reservedBeds: {
      type: Number,
      required: true,
      min: [0, 'Reserved beds cannot be negative'],
      default: 0,
    },
    isDemoData: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
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

bedInventorySchema.pre('validate', function () {
  const total = Number(this.totalBeds);
  const occupied = Number(this.occupiedBeds);
  const reserved = Number(this.reservedBeds);
  const available = Number(this.availableBeds);

  if (
    !Number.isInteger(total) ||
    !Number.isInteger(occupied) ||
    !Number.isInteger(reserved) ||
    !Number.isInteger(available)
  ) {
    this.invalidate('totalBeds', 'All bed counts must be whole integers.');
    return;
  }

  if (total < 0 || occupied < 0 || reserved < 0 || available < 0) {
    this.invalidate('availableBeds', 'Bed counts cannot be negative.');
    return;
  }

  if (available > total) {
    this.invalidate('availableBeds', 'Available beds cannot exceed total beds.');
    return;
  }

  if (available + occupied + reserved !== total) {
    this.invalidate(
      'totalBeds',
      'Available, occupied, and reserved beds must equal total beds.'
    );
  }
});

bedInventorySchema.index({ availableBeds: 1 });

const BedInventory =
  mongoose.models.BedInventory || mongoose.model('BedInventory', bedInventorySchema);

export default BedInventory;
