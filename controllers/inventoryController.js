import Inventory from '../models/Inventory.js';
import Category from '../models/Category.js';

// Get all inventory with shape filtering
export const getAllInventory = async (req, res) => {
  try {
    const {
      search,
      category,
      status,
      shape,  // NEW: shape filter
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { serialNumber: new RegExp(search, 'i') },
        { purchaseCode: new RegExp(search, 'i') },
        { saleCode: new RegExp(search, 'i') }
      ];
    }

    if (category && category !== 'All Categories') {
      query.category = category;
    }

    if (status && status !== 'All Status') {
      query.status = status;
    }

    // NEW: Shape filtering
    if (shape && shape !== 'All Shapes') {
      query.$or = [
        { shapeType: 'single', singleShape: shape },
        { shapeType: 'mix', 'shapes.shapeName': shape }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Inventory.find(query)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Inventory.countDocuments(query)
    ]);

    // Transform data to include shape information
    const transformedItems = items.map(item => ({
      ...item,
      displayShapes: item.shapeType === 'single'
        ? [item.singleShape]
        : item.shapes.map(s => s.shapeName)
    }));

    res.status(200).json({
      success: true,
      data: transformedItems,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message
    });
  }
};

// Get all shapes for filter dropdown
export const getAllShapes = async (req, res) => {
  try {
    const shapes = await Inventory.getAllUniqueShapes();

    res.status(200).json({
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

// Create new inventory item
export const createInventory = async (req, res) => {
  try {
    const {
      serialNumber,
      category,
      shapeType,
      singleShape,
      shapes,
      totalPieces,
      totalWeight,
      purchaseCode,
      saleCode,
      dimensions,
      certification,
      location,
      status,
      description
    } = req.body;

    // Validation
    if (!serialNumber || !category || !shapeType) {
      return res.status(400).json({
        success: false,
        message: 'Serial number, category, and shape type are required'
      });
    }

    // Check for duplicate serial number
    const exists = await Inventory.findOne({ serialNumber, isDeleted: false });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Serial number already exists'
      });
    }

    // Validate shape configuration
    if (shapeType === 'single' && !singleShape) {
      return res.status(400).json({
        success: false,
        message: 'Single shape name is required for single shape type'
      });
    }

    if (shapeType === 'mix' && (!shapes || shapes.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one shape is required for mix shape type'
      });
    }

    // Create inventory item
    const inventoryData = {
      serialNumber,
      category,
      shapeType,
      purchaseCode,
      saleCode,
      dimensions,
      certification,
      location,
      status: status || 'In Stock',
      description
    };

    if (shapeType === 'single') {
      inventoryData.singleShape = singleShape;
      inventoryData.totalPieces = totalPieces;
      inventoryData.totalWeight = totalWeight;
    } else {
      inventoryData.shapes = shapes;
    }

    const inventory = new Inventory(inventoryData);
    await inventory.save();

    await inventory.populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: inventory
    });
  } catch (error) {
    console.error('Error creating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inventory item',
      error: error.message
    });
  }
};

// Update inventory item
export const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const inventory = await Inventory.findOne({ _id: id, isDeleted: false });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt') {
        inventory[key] = updateData[key];
      }
    });

    await inventory.save();
    await inventory.populate('category', 'name');

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: inventory
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item',
      error: error.message
    });
  }
};

// Get single inventory item
export const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findOne({ _id: id, isDeleted: false })
      .populate('category', 'name');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
};

// Soft delete inventory
export const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findOne({ _id: id, isDeleted: false });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    inventory.isDeleted = true;
    inventory.deletedAt = new Date();
    await inventory.save();

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message
    });
  }
};


