import express from 'express';
import { getAllShapes, createShape } from '../controllers/shapeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all shapes
router.get('/', protect, getAllShapes);

// Create a new shape
router.post('/', protect, createShape);

export default router;