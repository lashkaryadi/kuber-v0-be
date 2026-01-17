import mongoose from "mongoose";

const recycleBinSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["inventory", "category"],
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    entityData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional: Auto-delete after 30 days
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ COMPOUND INDEX for queries
recycleBinSchema.index({ ownerId: 1, entityType: 1, deletedAt: -1 });

// ✅ TTL INDEX (auto-delete after expiresAt)
recycleBinSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

recycleBinSchema.set("toJSON", {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("RecycleBin", recycleBinSchema);
