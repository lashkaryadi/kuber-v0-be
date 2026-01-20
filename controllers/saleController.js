import Sale from '../models/Sale.js';
import Inventory from '../models/Inventory.js';
import mongoose from 'mongoose';

// Create new sale
export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      customer = {}, 
      items, 
      taxRate = 0, 
      discount = 0, 
      paymentMethod = 'Cash', 
      paymentStatus = 'Paid', 
      amountPaid = 0, 
      notes = '' 
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      throw new Error('At least one item is required');
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Process each item and validate availability
    const processedItems = [];

    for (const item of items) {
      const inventory = await Inventory.findById(item.inventoryId).session(session);

      if (!inventory) {
        throw new Error(`Inventory item ${item.inventoryId} not found`);
      }

      if (inventory.shapeType === 'single') {
        // Validate single shape sale
        if (!item.singleShape) {
          throw new Error(`Single shape data required for ${inventory.serialNumber}`);
        }

        if (item.singleShape.pieces > inventory.availablePieces) {
          throw new Error(`Insufficient pieces for ${inventory.serialNumber}`);
        }

        if (item.singleShape.weight > inventory.availableWeight) {
          throw new Error(`Insufficient weight for ${inventory.serialNumber}`);
        }

        // Calculate line total
        item.singleShape.lineTotal = item.singleShape.weight * item.singleShape.pricePerCarat;
        item.totalAmount = item.singleShape.lineTotal;
        item.totalPieces = item.singleShape.pieces;
        item.totalWeight = item.singleShape.weight;

        // Reduce inventory
        inventory.reduceQuantity(
          inventory.singleShape,
          item.singleShape.pieces,
          item.singleShape.weight
        );

      } else if (inventory.shapeType === 'mix') {
        // Validate mix shape sale
        if (!item.soldShapes || item.soldShapes.length === 0) {
          throw new Error(`Shape data required for ${inventory.serialNumber}`);
        }

        let totalPieces = 0;
        let totalWeight = 0;
        let totalAmount = 0;

        for (const soldShape of item.soldShapes) {
          const invShape = inventory.shapes.find(s => s.shapeName === soldShape.shapeName);

          if (!invShape) {
            throw new Error(`Shape ${soldShape.shapeName} not found in ${inventory.serialNumber}`);
          }

          if (soldShape.pieces > invShape.pieces) {
            throw new Error(`Insufficient pieces for ${soldShape.shapeName} in ${inventory.serialNumber}`);
          }

          if (soldShape.weight > invShape.weight) {
            throw new Error(`Insufficient weight for ${soldShape.shapeName} in ${inventory.serialNumber}`);
          }

          // Calculate line total for this shape
          soldShape.lineTotal = soldShape.weight * soldShape.pricePerCarat;

          totalPieces += soldShape.pieces;
          totalWeight += soldShape.weight;
          totalAmount += soldShape.lineTotal;

          // Reduce inventory for this shape
          inventory.reduceQuantity(soldShape.shapeName, soldShape.pieces, soldShape.weight);
        }

        item.totalPieces = totalPieces;
        item.totalWeight = totalWeight;
        item.totalAmount = totalAmount;
      }

      // Save inventory changes
      await inventory.save({ session });

      // Add processed item data
      processedItems.push({
        inventoryId: inventory._id,
        serialNumber: inventory.serialNumber,
        category: inventory.category.name || inventory.category,
        shapeType: inventory.shapeType,
        singleShape: item.singleShape,
        soldShapes: item.soldShapes,
        totalPieces: item.totalPieces,
        totalWeight: item.totalWeight,
        totalAmount: item.totalAmount
      });
    }

    // Create sale document
    const sale = new Sale({
      invoiceNumber,
      saleDate: new Date(),
      customer,
      items: processedItems,
      taxRate: taxRate || 0,
      discount: discount || 0,
      paymentMethod,
      paymentStatus: paymentStatus || 'Pending',
      amountPaid: amountPaid || 0,
      notes
    });

    await sale.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating sale:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create sale'
    });
  } finally {
    session.endSession();
  }
};

// Generate invoice number
async function generateInvoiceNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const prefix = `INV-${year}${month}`;

  const lastSale = await Sale.findOne({
    invoiceNumber: new RegExp(`^${prefix}`)
  }).sort({ invoiceNumber: -1 });

  let sequence = 1;
  if (lastSale) {
    const lastSequence = parseInt(lastSale.invoiceNumber.split('-').pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(5, '0')}`;
}

// Get all sales
export const getAllSales = async (req, res) => {
  try {
    const {
      search,
      status,
      shape,  // NEW: shape filter
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const query = { isDeleted: false, status: { $ne: 'Cancelled' } };

    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') }
      ];
    }

    if (status && status !== 'All Status') {
      query.paymentStatus = status;
    }

    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // NEW: Filter by shape
    if (shape && shape !== 'All Shapes') {
      query.$or = [
        { 'items.singleShape.shapeName': shape },
        { 'items.soldShapes.shapeName': shape }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Sale.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
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

// Get single sale
export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id).populate('items.inventoryId');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
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

// Cancel/Void sale
export const cancelSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const sale = await Sale.findById(id).session(session);

    if (!sale) {
      throw new Error('Sale not found');
    }

    if (sale.status === 'Cancelled') {
      throw new Error('Sale is already cancelled');
    }

    // Restore inventory quantities
    for (const item of sale.items) {
      const inventory = await Inventory.findById(item.inventoryId).session(session);

      if (inventory) {
        if (item.shapeType === 'single') {
          inventory.availablePieces += item.singleShape.pieces;
          inventory.availableWeight += item.singleShape.weight;
        } else if (item.shapeType === 'mix') {
          for (const soldShape of item.soldShapes) {
            const invShape = inventory.shapes.find(s => s.shapeName === soldShape.shapeName);
            if (invShape) {
              invShape.pieces += soldShape.pieces;
              invShape.weight += soldShape.weight;
            }
          }

          inventory.availablePieces = inventory.shapes.reduce((sum, s) => sum + s.pieces, 0);
          inventory.availableWeight = inventory.shapes.reduce((sum, s) => sum + s.weight, 0);
        }

        // Update status
        if (inventory.availablePieces === inventory.totalPieces) {
          inventory.status = 'In Stock';
        } else {
          inventory.status = 'Partially Sold';
        }

        await inventory.save({ session });
      }
    }

    // Update sale status
    sale.status = 'Cancelled';
    sale.cancelledAt = new Date();
    sale.cancelReason = reason;

    await sale.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Sale cancelled successfully',
      data: sale
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error cancelling sale:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel sale'
    });
  } finally {
    session.endSession();
  }
};

