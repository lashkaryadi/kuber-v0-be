import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    companyName: { type: String, required: true },
    logoUrl: String,

    gstNumber: String,
    taxRate: { type: Number, default: 0 }, // GST %
    phone: String,
    email: String,
    address: String,
    


    signatureUrl: String,
  },
  
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
