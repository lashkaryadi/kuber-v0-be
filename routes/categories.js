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

// ✅ CREATE - Admin only
router.post("/", protect, preventStaffCategoryModification, createCategory);

// ✅ UPDATE - Admin only
router.put("/:id", protect, preventStaffCategoryModification, updateCategory);

// ✅ DELETE - Admin only
router.delete("/:id", protect, preventStaffCategoryDeletion, deleteCategory);

// ✅ EXPORT - Anyone can export
router.get("/export", protect, exportCategoriesToExcel);

export default router;
