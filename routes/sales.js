import express from 'express';
import {
  sellInventory,
  undoSale,
  getAllSales,
  getSaleById
} from '../controllers/saleController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

// Get all sales
router.get('/', protect, getAllSales);

// Get single sale
router.get('/:id', protect, getSaleById);

// Sell inventory (admin and staff)
router.post('/sell', protect, requireRole(['admin', 'staff']), sellInventory);

// Undo sale (admin can undo any, staff can undo their own)
router.post('/:id/undo', protect, requireRole(['admin', 'staff']), undoSale);

export default router;