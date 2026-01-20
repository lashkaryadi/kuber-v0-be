import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
// import auth from '../middleware/authMiddleware.js'; // If you have auth

const router = express.Router();

// Get all shapes for filter dropdown
router.get('/shapes', inventoryController.getAllShapes);

// Get all inventory (with shape filter support)
router.get('/', inventoryController.getAllInventory);

// Get single inventory
router.get('/:id', inventoryController.getInventoryById);

// Create inventory
router.post('/', inventoryController.createInventory);

// Update inventory
router.put('/:id', inventoryController.updateInventory);

// Delete inventory
router.delete('/:id', inventoryController.deleteInventory);

export default router;
