import express from 'express';
import {
  sellInventory,
  undoSale,
  getAllSales,
  getSaleById
} from '../controllers/saleController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all sales
router.get('/', protect, getAllSales);

// Get single sale
router.get('/:id', protect, getSaleById);

// Sell inventory
router.post('/sell', protect, sellInventory);

// Undo sale (admin only)
router.post('/:id/undo', protect, undoSale);

export default router;