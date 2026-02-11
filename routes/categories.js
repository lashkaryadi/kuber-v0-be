import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  exportCategoriesToExcel,
} from "../controllers/categoryController.js";
import {
  protect,
  preventStaffCategoryModification,
  preventStaffCategoryDeletion,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ GET - Anyone can view
router.get("/", protect, getCategories);

// ✅ EXPORT - Must be before /:id to avoid route conflict
router.get("/export", protect, exportCategoriesToExcel);

// ✅ CREATE - Admin only
router.post("/", protect, preventStaffCategoryModification, createCategory);

// ✅ UPDATE - Admin only
router.put("/:id", protect, preventStaffCategoryModification, updateCategory);

// ✅ DELETE - Admin only
router.delete("/:id", protect, preventStaffCategoryDeletion, deleteCategory);

export default router;
