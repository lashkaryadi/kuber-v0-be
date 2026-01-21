import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

// ==================== SHAPE ROUTES ====================
// Get all shapes for filter dropdown
router.get('/shapes', protect, inventoryController.getAllShapes);

// ==================== INVENTORY ROUTES ====================
// Get all inventory (with filters, search, pagination)
router.get('/', protect, inventoryController.getAllInventory);

// Get single inventory item
router.get('/:id', protect, inventoryController.getInventoryById);

// Create inventory item (admin + staff)
router.post('/', protect, requireRole(['admin', 'staff']), inventoryController.createInventory);

// Update inventory item (admin only)
router.put('/:id', protect, requireRole(['admin']), inventoryController.updateInventory);

// Delete inventory item (admin only)
router.delete('/:id', protect, requireRole(['admin']), inventoryController.deleteInventory);

// Bulk update inventory items (admin + staff)
router.post('/bulk-update', protect, requireRole(['admin', 'staff']), inventoryController.bulkUpdateInventory);

// Export inventory to Excel
router.get('/export/excel', protect, inventoryController.exportInventoryExcel);

export default router;
