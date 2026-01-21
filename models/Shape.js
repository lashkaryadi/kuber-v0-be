import mongoose from 'mongoose';

// ==================== SHAPE SCHEMA ====================
// This model stores master list of shapes for easy selection
const shapeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Multi-tenancy
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // Usage count (optional, for analytics)
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
// Unique shape name per owner
shapeSchema.index({ ownerId: 1, name: 1 }, {
  unique: true,
  partialFilterExpression: { isDeleted: false }
});

shapeSchema.index({ ownerId: 1, isDeleted: 1 });

// ==================== STATIC METHODS ====================

// Get or create shape
shapeSchema.statics.getOrCreate = async function(name, ownerId) {
  if (!name || !ownerId) {
    throw new Error('Shape name and ownerId are required');
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Shape name cannot be empty');
  }

  // Try to find existing shape
  let shape = await this.findOne({
    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    ownerId,
    isDeleted: false
  });

  // Create if not found
  if (!shape) {
    shape = await this.create({
      name: trimmedName,
      ownerId
    });
  }

  return shape;
};

// Increment usage count
shapeSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

export default mongoose.model('Shape', shapeSchema);