// import express from "express";
// import {
//   getAllItems,
//   createItem,
//   updateItem,
//   deleteItem,

// } from "../controllers/inventoryController.js";

// import { protect } from "../middleware/authMiddleware.js";

// const router = express.Router();

// router.get("/", protect, getAllItems);
// router.post("/", protect, createItem);
// router.put("/:id", protect, updateItem);
// router.delete("/:id", protect, deleteItem);

// export default router;

import express from "express";
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  importInventoryFromExcel,
  exportInventoryToExcel,
  importMiddleware,
  bulkUpdateInventory,
  downloadImportReport,
  confirmInventoryImport,
  getSellableInventory,
} from "../controllers/inventoryController.js";
import { previewInventoryExcel } from "../controllers/inventoryController.js";
import {
  protect,
  restrictStaffFromCriticalFields,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ GET - Anyone can view
router.get("/", protect, getInventory);

// ✅ CREATE - Anyone, but staff restrictions apply
router.post("/", protect, createInventoryItem);

// ✅ UPDATE - Staff CANNOT edit critical fields
router.put("/:id", protect, restrictStaffFromCriticalFields, updateInventoryItem);

// ✅ DELETE - Anyone can delete (moves to recycle bin)
router.delete("/:id", protect, deleteInventoryItem);

// ✅ IMPORT/EXPORT - Anyone
router.post("/import", protect, importMiddleware, importInventoryFromExcel);
router.get("/export", protect, exportInventoryToExcel);
router.post("/import/preview", protect, importMiddleware, previewInventoryExcel);
router.post("/import/confirm", protect, importMiddleware, confirmInventoryImport);
router.post("/import/report", protect, downloadImportReport);

// ✅ BULK UPDATE - Staff restrictions apply
router.put("/bulk-update", protect, restrictStaffFromCriticalFields, bulkUpdateInventory);

// ✅ SELLABLE INVENTORY
router.get("/sellable", protect, getSellableInventory);

export default router;
