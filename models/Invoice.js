import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  packaging: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Packaging",
  },

  clientName: String,

  items: [
    {
      inventory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
      },
      weight: Number,
      pricePerCarat: Number,
      amount: Number,
    },
  ],

  subtotal: Number,
  tax: Number,
  totalAmount: Number,

  status: {
    type: String,
    enum: ["paid", "unpaid"],
    default: "unpaid",
  },

}, { timestamps: true });

export default mongoose.model("Invoice", invoiceSchema);
