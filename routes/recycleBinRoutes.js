import express from "express";
import {
  getRecycleBinItems,
  restoreItems,
  permanentlyDeleteItems,
  emptyRecycleBin,
} from "../controllers/recycleBinController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get recycle bin items
router.get("/", protect, getRecycleBinItems);

// Restore items
router.post("/restore", protect, restoreItems);

// Permanently delete items
router.delete("/delete", protect, permanentlyDeleteItems);

// Empty entire recycle bin
router.delete("/empty", protect, emptyRecycleBin);

export default router;
