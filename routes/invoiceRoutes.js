import express from "express";
import { generateInvoice } from "../controllers/invoiceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate", protect, generateInvoice);

export default router;
