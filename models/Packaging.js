import mongoose from "mongoose";

const packagingSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientPhone: String,
  clientAddress: String,

  items: [
    {
      inventory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },
      weight: Number,
      pricePerCarat: Number,
      pieces: Number,
    },
  ],

  status: {
    type: String,
    enum: ["open", "partially_sold", "sold", "returned"],
    default: "open",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

export default mongoose.model("Packaging", packagingSchema);
