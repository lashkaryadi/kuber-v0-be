// import db from '../database.js';

// export function getAll() {
//   return db.prepare('SELECT * FROM inventory').all();
// }

// export function getById(id) {
//   return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
// }

// export function create(item) {
//   const stmt = db.prepare(`INSERT INTO inventory
//     (serialNumber, category, pieces, weight, dimensions, certification, location, approvalStatus)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
//   const info = stmt.run(
//     item.serialNumber, item.category, item.pieces, item.weight,
//     item.dimensions, item.certification, item.location, item.approvalStatus
//   );
//   return { id: info.lastInsertRowid, ...item };
// }

// export function update(id, changes) {
//   const stmt = db.prepare(`UPDATE inventory SET
//     serialNumber = ?, category = ?, pieces = ?, weight = ?,
//     dimensions = ?, certification = ?, location = ?, approvalStatus = ?
//     WHERE id = ?`);
//   const info = stmt.run(
//     changes.serialNumber, changes.category, changes.pieces, changes.weight,
//     changes.certification, changes.location, changes.approvalStatus, id
//   );
//   return info.changes;
// }

// export function remove(id) {
//   const stmt = db.prepare('DELETE FROM inventory WHERE id = ?');
//   const info = stmt.run(id);
//   return info.changes;
// }

import mongoose from 'mongoose';

// Define shape schema for embedded documents
const shapeSchema = new mongoose.Schema({
  shapeName: {
    type: String,
    required: true,
    enum: [
      'Round', 'Oval', 'Emerald', 'Princess', 'Marquise',
      'Pear', 'Cushion', 'Asscher', 'Radiant', 'Heart',
      'Baguette', 'Trillion', 'Briolette', 'Rose Cut'
    ]
  },
  pieces: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },

  // Shape configuration
  shapeType: {
    type: String,
    enum: ['single', 'mix'],
    default: 'single'
  },

  // For single shape items
  singleShape: {
    type: String,
    enum: [
      'Round', 'Oval', 'Emerald', 'Princess', 'Marquise',
      'Pear', 'Cushion', 'Asscher', 'Radiant', 'Heart',
      'Baguette', 'Trillion', 'Briolette', 'Rose Cut', null
    ],
    default: null
  },

  // For mix shape items - array of shapes
  shapes: {
    type: [shapeSchema],
    default: []
  },

  // Total quantities (auto-calculated)
  totalPieces: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  totalWeight: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  // Available quantities (after sales)
  availablePieces: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  availableWeight: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  purchaseCode: {
    type: String,
    trim: true
  },

  saleCode: {
    type: String,
    trim: true
  },

  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['mm', 'cm'],
      default: 'mm'
    }
  },

  certification: {
    type: String,
    trim: true
  },

  location: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: ['In Stock', 'Pending', 'Partially Sold', 'Sold'],
    default: 'In Stock'
  },

  description: {
    type: String,
    trim: true
  },

  images: [{
    type: String
  }],

  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Virtual for getting all unique shapes in the item
inventorySchema.virtual('allShapes').get(function() {
  if (this.shapeType === 'single' && this.singleShape) {
    return [this.singleShape];
  } else if (this.shapeType === 'mix' && this.shapes.length > 0) {
    return this.shapes.map(s => s.shapeName);
  }
  return [];
});

// Pre-save middleware to calculate totals
inventorySchema.pre('save', function(next) {
  if (this.shapeType === 'single') {
    // For single shape, totalPieces and totalWeight are direct values
    this.shapes = []; // Clear shapes array
  } else if (this.shapeType === 'mix') {
    // For mix, calculate from shapes array
    this.singleShape = null; // Clear single shape

    this.totalPieces = this.shapes.reduce((sum, shape) => sum + (shape.pieces || 0), 0);
    this.totalWeight = this.shapes.reduce((sum, shape) => sum + (shape.weight || 0), 0);
  }

  // Initialize available quantities if not set
  if (this.isNew) {
    this.availablePieces = this.totalPieces;
    this.availableWeight = this.totalWeight;
  }

  next();
});

// Method to get available quantity by shape
inventorySchema.methods.getAvailableByShape = function(shapeName) {
  if (this.shapeType === 'single' && this.singleShape === shapeName) {
    return {
      pieces: this.availablePieces,
      weight: this.availableWeight
    };
  } else if (this.shapeType === 'mix') {
    const shape = this.shapes.find(s => s.shapeName === shapeName);
    return shape ? { pieces: shape.pieces, weight: shape.weight } : { pieces: 0, weight: 0 };
  }
  return { pieces: 0, weight: 0 };
};

// Method to reduce quantity after sale
inventorySchema.methods.reduceQuantity = function(shapeName, soldPieces, soldWeight) {
  if (this.shapeType === 'single' && this.singleShape === shapeName) {
    this.availablePieces -= soldPieces;
    this.availableWeight -= soldWeight;
  } else if (this.shapeType === 'mix') {
    const shape = this.shapes.find(s => s.shapeName === shapeName);
    if (shape) {
      shape.pieces -= soldPieces;
      shape.weight -= soldWeight;
    }

    // Recalculate totals
    this.availablePieces = this.shapes.reduce((sum, s) => sum + s.pieces, 0);
    this.availableWeight = this.shapes.reduce((sum, s) => sum + s.weight, 0);
  }

  // Update status
  if (this.availablePieces === 0) {
    this.status = 'Sold';
  } else if (this.availablePieces < this.totalPieces) {
    this.status = 'Partially Sold';
  }
};

// Static method to get all unique shapes in inventory
inventorySchema.statics.getAllUniqueShapes = async function() {
  const singleShapes = await this.distinct('singleShape', {
    shapeType: 'single',
    isDeleted: false
  });

  const mixShapes = await this.aggregate([
    { $match: { shapeType: 'mix', isDeleted: false } },
    { $unwind: '$shapes' },
    { $group: { _id: '$shapes.shapeName' } }
  ]);

  const allShapes = [...new Set([
    ...singleShapes.filter(s => s),
    ...mixShapes.map(s => s._id)
  ])];

  return allShapes.sort();
};

// Indexes for better query performance
inventorySchema.index({ category: 1, status: 1 });
inventorySchema.index({ shapeType: 1, singleShape: 1 });
inventorySchema.index({ 'shapes.shapeName': 1 });
inventorySchema.index({ isDeleted: 1 });

export default mongoose.model('Inventory', inventorySchema);
