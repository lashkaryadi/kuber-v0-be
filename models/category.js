import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: [100, "Category name too long"],
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: [10, "Category code too long"],
    },

    serialCounter: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      maxlength: [500, "Description too long"],
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ SOFT DELETE FIELDS
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// ✅ UNIQUE INDEX (only for non-deleted categories per owner)
categorySchema.index(
  { ownerId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// ✅ COMPOUND INDEX for queries
categorySchema.index({ ownerId: 1, isDeleted: 1 });

categorySchema.set("toJSON", {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Category", categorySchema);
