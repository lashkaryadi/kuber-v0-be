import mongoose from "mongoose";

const recycleBinSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["inventory", "category"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    entityData: {
      type: Object,
      required: true,
    },
    deletedBy: {
      username: String,
      email: String,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("RecycleBin", recycleBinSchema);
