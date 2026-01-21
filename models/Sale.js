import mongoose from 'mongoose';

// ==================== SOLD SHAPE SCHEMA ====================
const soldShapeSchema = new mongoose.Schema({
  shape: {
    type: String,
    required: true
  },
  pieces: {
    type: Number,
    required: true,
    min: 0
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerCarat: {
    type: Number,
    default: 0,
    min: 0
  },
  lineTotal: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// ==================== SALE SCHEMA ====================
const saleSchema = new mongoose.Schema({
  // Reference to inventory item
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
    index: true
  },

  // Shapes that were sold
  soldShapes: [soldShapeSchema],

  // Sale totals
  totalPieces: {
    type: Number,
    required: true,
    min: 0
  },

  totalWeight: {
    type: Number,
    required: true,
    min: 0
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Customer information
  customer: {
    name: {
      type: String,
      trim: true,
      default: ""
    },
    email: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    }
  },

  // Invoice details
  invoiceNumber: {
    type: String,
    trim: true,
    index: true
  },

  soldAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Multi-tenancy
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // Cancellation fields
  cancelled: {
    type: Boolean,
    default: false,
    index: true
  },

  cancelledAt: {
    type: Date
  },

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  cancelReason: {
    type: String,
    trim: true,
    default: ""
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
saleSchema.index({ ownerId: 1, cancelled: 1 });
saleSchema.index({ inventoryId: 1 });
saleSchema.index({ invoiceNumber: 1 });
saleSchema.index({ soldAt: -1 });
saleSchema.index({ createdAt: -1 });

// ==================== VIRTUAL FIELDS ====================
saleSchema.virtual('isActive').get(function() {
  return !this.cancelled;
});

export default mongoose.model('Sale', saleSchema);