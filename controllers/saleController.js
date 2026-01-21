import Inventory from '../models/Inventory.js';
import Sale from '../models/Sale.js';

// ==================== SELL INVENTORY ====================
export const sellInventory = async (req, res) => {
  try {
    const { inventoryId, soldShapes, customer, invoiceNumber } = req.body;
    const ownerId = req.user.ownerId;

    // ==================== VALIDATION ====================
    if (!inventoryId || !soldShapes || soldShapes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Inventory ID and sold shapes are required'
      });
    }

    // Find inventory
    const inventory = await Inventory.findOne({
      _id: inventoryId,
      ownerId,
      isDeleted: false
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if item is already sold
    if (inventory.status === 'sold') {
      return res.status(400).json({
        success: false,
        message: 'This item is already sold'
      });
    }

    // ==================== VALIDATE EACH SHAPE ====================
    for (const sold of soldShapes) {
      if (inventory.shapeType === 'single') {
        // For single shape
        if (sold.pieces > inventory.availablePieces) {
          return res.status(400).json({
            success: false,
            message: `Only ${inventory.availablePieces} pieces available`
          });
        }
        if (sold.weight > inventory.availableWeight) {
          return res.status(400).json({
            success: false,
            message: `Only ${inventory.availableWeight} carats available`
          });
        }
      } else {
        // For mix shapes
        const invShape = inventory.shapes.find(s => s.shape === sold.shape);
        if (!invShape) {
          return res.status(400).json({
            success: false,
            message: `Shape "${sold.shape}" not found in inventory`
          });
        }
        if (sold.pieces > invShape.pieces) {
          return res.status(400).json({
            success: false,
            message: `Only ${invShape.pieces} pieces of ${sold.shape} available`
          });
        }
        if (sold.weight > invShape.weight) {
          return res.status(400).json({
            success: false,
            message: `Only ${invShape.weight} carats of ${sold.shape} available`
          });
        }
      }
    }

    // ==================== REDUCE INVENTORY QUANTITIES ====================
    for (const sold of soldShapes) {
      if (inventory.shapeType === 'single') {
        inventory.reduceQuantity(null, sold.pieces, sold.weight);
      } else {
        inventory.reduceQuantity(sold.shape, sold.pieces, sold.weight);
      }
    }

    await inventory.save();

    // ==================== CREATE SALE RECORD ====================
    const totalPieces = soldShapes.reduce((sum, s) => sum + s.pieces, 0);
    const totalWeight = soldShapes.reduce((sum, s) => sum + s.weight, 0);
    const totalAmount = soldShapes.reduce((sum, s) => sum + (s.lineTotal || 0), 0);

    const sale = await Sale.create({
      inventoryId,
      soldShapes,
      totalPieces,
      totalWeight,
      totalAmount,
      customer: customer || {},
      invoiceNumber: invoiceNumber || '',
      ownerId
    });

    // Populate references
    await sale.populate('inventoryId', 'serialNumber category');

    res.json({
      success: true,
      message: 'Sale completed successfully',
      data: sale
    });
  } catch (error) {
    console.error('Error selling inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete sale',
      error: error.message
    });
  }
};

// ==================== UNDO SALE ====================
export const undoSale = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.ownerId;
    const userRole = req.user.role;

    // ADMIN ONLY
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can undo sales'
      });
    }

    const sale = await Sale.findOne({ _id: id, ownerId });
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found"
      });
    }

    if (sale.cancelled) {
      return res.status(400).json({
        success: false,
        message: "Sale already cancelled"
      });
    }

    const inventory = await Inventory.findById(sale.inventoryId);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found"
      });
    }

    // ==================== RESTORE SHAPES ====================
    for (const sold of sale.soldShapes) {
      if (inventory.shapeType === 'single') {
        inventory.restoreQuantity(null, sold.pieces, sold.weight);
      } else {
        inventory.restoreQuantity(sold.shape, sold.pieces, sold.weight);
      }
    }

    await inventory.save();

    // ==================== MARK SALE AS CANCELLED ====================
    sale.cancelled = true;
    sale.cancelledAt = new Date();
    sale.cancelledBy = req.user.id;
    await sale.save();

    res.json({
      success: true,
      message: "Sale successfully undone"
    });
  } catch (error) {
    console.error('Error undoing sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to undo sale',
      error: error.message
    });
  }
};

// ==================== GET ALL SALES ====================
export const getAllSales = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortOrder = 'desc',
      includeCancelled = 'false'
    } = req.query;

    const ownerId = req.user.ownerId;

    // Validate pagination parameters to prevent resource exhaustion
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a number between 1 and 100'
      });
    }

    // Build query
    const query = { ownerId };

    // Exclude cancelled sales by default
    if (includeCancelled === 'false') {
      query.cancelled = false;
    }

    const skip = (pageNum - 1) * limitNum;

    const sales = await Sale.find(query)
      .populate('inventoryId', 'serialNumber category')
      .populate('cancelledBy', 'username email')
      .sort({ soldAt: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      data: sales,
      meta: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales',
      error: error.message
    });
  }
};

// ==================== GET SINGLE SALE ====================
export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.ownerId;

    const sale = await Sale.findOne({ _id: id, ownerId })
      .populate('inventoryId', 'serialNumber category singleShape shapes')
      .populate('cancelledBy', 'username email');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale',
      error: error.message
    });
  }
};

