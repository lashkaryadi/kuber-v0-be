import express from "express";
import {
  getRecycleBin,
  restoreItems,
  deleteItems,
  emptyBin,
} from "../controllers/recycleBinController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getRecycleBin);
router.post("/restore", protect, restoreItems);
router.delete("/delete", protect, deleteItems);
router.post("/empty", protect, emptyBin);

export default router;
