// import express from 'express';
// import * as soldController from '../controllers/soldController.js';

// const router = express.Router();

// router.get('/', soldController.getAllSold);
// router.get('/:id', soldController.getSoldById);
// router.post('/', soldController.recordSale);

// export default router;

import express from "express";
import {
  getSoldItems,
  getSoldById,
  recordSale,
  undoSold,
  exportSoldItemsToExcel,
  markAsSold,
} from "../controllers/soldController.js";
import {
  protect,
  preventStaffSoldDeletion,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getSoldItems);
router.get("/:id", protect, getSoldById);
// ❌ Disabled – use mark-as-sold only
// router.post("/", protect, recordSale);
router.post("/mark-as-sold", protect, markAsSold);
// ✅ UNDO - Admin only
router.delete("/:id/undo", protect, preventStaffSoldDeletion, undoSold);
// ❌ REMOVED: Update sold feature disabled
// router.put("/:id", protect, updateSold);
router.get("/export", protect, exportSoldItemsToExcel);
export default router;
