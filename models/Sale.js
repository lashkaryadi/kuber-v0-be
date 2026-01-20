import mongoose from 'mongoose';

// Shape-wise sale detail schema
const soldShapeSchema = new mongoose.Schema({
  shapeName: {
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
    required: true,
    min: 0
  },
  lineTotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

// Sale item schema
const saleItemSchema = new mongoose.Schema({
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  serialNumber: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  shapeType: {
    type: String,
    enum: ['single', 'mix'],
    required: true
  },

  // For single shape sales
  singleShape: {
    shapeName: String,
    pieces: Number,
    weight: Number,
    pricePerCarat: Number,
    lineTotal: Number
  },

  // For mix shape sales
  soldShapes: [soldShapeSchema],

  totalPieces: {
    type: Number,
    required: true
  },
  totalWeight: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  }
}, { _id: true });

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },

  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  customer: {
    name: String,
    phone: String,
    email: String,
    address: String
  },

  items: [saleItemSchema],

  subtotal: {
    type: Number,
    required: true,
    min: 0
  },

  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  discount: {
    type: Number,
    default: 0,
    min: 0
  },

  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },

  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending'
  },

  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Bank Transfer', 'Cheque', 'UPI'],
    default: 'Cash'
  },

  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },

  notes: {
    type: String
  },

  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Voided'],
    default: 'Active'
  },

  cancelledAt: {
    type: Date
  },

  cancelReason: {
    type: String
  },

  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totals
saleSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalAmount, 0);

  // Calculate tax
  this.taxAmount = (this.subtotal * this.taxRate) / 100;

  // Calculate grand total
  this.grandTotal = this.subtotal + this.taxAmount - this.discount;

  next();
});

// Method to get shape-wise breakdown
saleSchema.methods.getShapeBreakdown = function() {
  const breakdown = {};

  this.items.forEach(item => {
    if (item.shapeType === 'single' && item.singleShape) {
      const shapeName = item.singleShape.shapeName;
      if (!breakdown[shapeName]) {
        breakdown[shapeName] = { pieces: 0, weight: 0, amount: 0 };
      }
      breakdown[shapeName].pieces += item.singleShape.pieces;
      breakdown[shapeName].weight += item.singleShape.weight;
      breakdown[shapeName].amount += item.singleShape.lineTotal;
    } else if (item.shapeType === 'mix' && item.soldShapes) {
      item.soldShapes.forEach(shape => {
        if (!breakdown[shape.shapeName]) {
          breakdown[shape.shapeName] = { pieces: 0, weight: 0, amount: 0 };
        }
        breakdown[shape.shapeName].pieces += shape.pieces;
        breakdown[shape.shapeName].weight += shape.weight;
        breakdown[shape.shapeName].amount += shape.lineTotal;
      });
    }
  });

  return breakdown;
};

export default mongoose.model('Sale', saleSchema);
