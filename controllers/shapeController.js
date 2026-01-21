import Shape from '../models/Shape.js';
import Inventory from '../models/Inventory.js';

// ==================== GET ALL SHAPES ====================
export const getAllShapes = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;

    // Get unique shapes from inventory
    const shapes = await Inventory.getAllUniqueShapes(ownerId);

    res.json({
      success: true,
      data: shapes
    });
  } catch (error) {
    console.error('Error fetching shapes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shapes',
      error: error.message
    });
  }
};

// ==================== CREATE SHAPE ====================
export const createShape = async (req, res) => {
  try {
    const { name } = req.body;
    const ownerId = req.user.ownerId;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Shape name is required'
      });
    }

    // Check if shape already exists
    const existing = await Shape.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      ownerId,
      isDeleted: false
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Shape already exists'
      });
    }

    // Create shape
    const shape = await Shape.create({
      name: name.trim(),
      ownerId
    });

    res.status(201).json({
      success: true,
      message: 'Shape created successfully',
      data: shape
    });
  } catch (error) {
    console.error('Error creating shape:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shape',
      error: error.message
    });
  }
};

// ==================== DELETE SHAPE ====================
export const deleteShape = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.ownerId;
    const userRole = req.user.role;

    // ADMIN ONLY
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete shapes'
      });
    }

    const shape = await Shape.findOne({
      _id: id,
      ownerId,
      isDeleted: false
    });

    if (!shape) {
      return res.status(404).json({
        success: false,
        message: 'Shape not found'
      });
    }

    // Check if shape is used in inventory
    const usedInInventory = await Inventory.exists({
      $or: [
        { singleShape: shape.name },
        { 'shapes.shape': shape.name }
      ],
      ownerId,
      isDeleted: false
    });

    if (usedInInventory) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete shape that is used in inventory'
      });
    }

    // Soft delete
    shape.isDeleted = true;
    shape.deletedAt = new Date();
    await shape.save();

    res.json({
      success: true,
      message: 'Shape deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shape:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shape',
      error: error.message
    });
  }
};