// import express from "express";
// import { generateInvoice, getInvoiceBySold, createBulkInvoice, getInvoiceById, generateInvoiceFromSold, updateInvoice, lockInvoice, generateBulkInvoice } from "../controllers/invoiceController.js";
// import {
//   protect,
//   preventInvoiceModification,
// } from "../middleware/authMiddleware.js";
// import { downloadInvoicePDF } from "../controllers/invoiceController.js";



// const router = express.Router();

// router.post("/generate", protect, generateInvoice);
// router.post("/bulk-create", protect, createBulkInvoice);
// router.post("/from-sold", protect, generateInvoiceFromSold);
// // ✅ UPDATE - Only if NOT locked
// router.put("/:id", protect, preventInvoiceModification, updateInvoice);
// router.post("/:id/lock", protect, lockInvoice);
// router.post("/bulk", protect, generateBulkInvoice);
// router.get("/sold/:soldId", protect, getInvoiceBySold);
// router.get("/:id", protect, getInvoiceById);
// router.get("/:id/pdf", protect, downloadInvoicePDF);


// export default router;
