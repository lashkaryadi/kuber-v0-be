import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== SHAPE ROUTES ====================
// Get all shapes for filter dropdown
router.get('/shapes', protect, inventoryController.getAllShapes);

// ==================== INVENTORY ROUTES ====================
// Get all inventory (with filters, search, pagination)
router.get('/', protect, inventoryController.getAllInventory);

// Get single inventory item
router.get('/:id', protect, inventoryController.getInventoryById);

// Create inventory item
router.post('/', protect, inventoryController.createInventory);

// Update inventory item
router.put('/:id', protect, inventoryController.updateInventory);

// Delete inventory item (soft delete, admin only)
router.delete('/:id', protect, inventoryController.deleteInventory);

// Bulk update inventory items
router.post('/bulk-update', protect, inventoryController.bulkUpdateInventory);

// Export inventory to Excel
router.get('/export/excel', protect, inventoryController.exportInventoryExcel);

export default router;
