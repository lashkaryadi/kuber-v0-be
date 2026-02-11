import express from 'express';
import multer from 'multer';
import * as inventoryController from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

// Multer for CSV upload (memory storage)
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// ==================== SHAPE ROUTES ====================
// Get all shapes for filter dropdown
router.get('/shapes', protect, inventoryController.getAllShapes);

// ==================== EXPORT (must be before /:id) ====================
router.get('/export/excel', protect, inventoryController.exportInventoryExcel);

// ==================== CSV IMPORT ====================
router.post('/import/csv', protect, requireRole(['admin', 'staff']), csvUpload.single('file'), inventoryController.importInventoryCSV);

// ==================== INVENTORY ROUTES ====================
// Get all inventory (with filters, search, pagination)
router.get('/', protect, inventoryController.getAllInventory);

// Get single inventory item
router.get('/:id', protect, inventoryController.getInventoryById);

// Create inventory item (admin + staff)
router.post('/', protect, requireRole(['admin', 'staff']), inventoryController.createInventory);

// Update inventory item (admin + staff with field restrictions)
router.put('/:id', protect, requireRole(['admin', 'staff']), inventoryController.updateInventory);

// Delete inventory item (admin only)
router.delete('/:id', protect, requireRole(['admin']), inventoryController.deleteInventory);

// Bulk update inventory items (admin + staff)
router.post('/bulk-update', protect, requireRole(['admin', 'staff']), inventoryController.bulkUpdateInventory);

export default router;
