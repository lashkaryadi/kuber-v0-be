import express from 'express';
import { 
  getAllShapes, 
  createShape, 
  deleteShape 
} from '../controllers/shapeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all shapes
router.get('/', protect, getAllShapes);

// Create new shape
router.post('/', protect, createShape);

// Delete shape (admin only)
router.delete('/:id', protect, deleteShape);

export default router;