import Inventory from '../models/Inventory.js';
import Category from '../models/Category.js';
import Shape from '../models/Shape.js';
import RecycleBin from '../models/RecycleBin.js';
import { generateExcel } from '../utils/excel.js';
import mongoose from 'mongoose';
import { parse } from 'csv-parse/sync';

// ==================== GET ALL INVENTORY ====================
export const getAllInventory = async (req, res) => {
  try {
    const {
      search,
      category,
      status,
      shape,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
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
    const query = { ownerId, isDeleted: false };

    // Search
    if (search) {
      // Validate search length to prevent ReDoS attacks
      if (typeof search !== 'string' || search.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be a string with maximum 50 characters'
        });
      }

      query.$or = [
        { serialNumber: new RegExp(search, 'i') },
        { purchaseCode: new RegExp(search, 'i') },
        { saleCode: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
        { certification: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    // Category filter - use category code instead of ID
    if (category && category !== "ALL") {
      // Find category by code and get its ID
      const categoryDoc = await Category.findOne({
        code: category,
        ownerId,
        isDeleted: false
      });

      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    // Status filter
    if (status && status !== 'All Status') {
      const statusMap = {
        'In Stock': 'in_stock',
        'Pending': 'pending',
        'Partially Sold': 'partially_sold',
        'Sold': 'sold'
      };
      query.status = statusMap[status] || status.toLowerCase().replace(' ', '_');
    }

    // Shape filter
    if (shape && shape !== 'All Shapes') {
      query.$or = [
        { shapeType: 'single', singleShape: shape },
        { shapeType: 'mix', 'shapes.shape': shape }
      ];
    }

    // Validate allowed sort fields to prevent NoSQL injection
    const allowedSortFields = [
      'createdAt', 'updatedAt', 'serialNumber', 'totalPieces',
      'totalWeight', 'availablePieces', 'availableWeight', 'status'
    ];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`
      });
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Inventory.find(query)
        .populate('category', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inventory.countDocuments(query)
    ]);

    // Transform for frontend
    const transformedItems = items.map(item => ({
      ...item,
      _id: item._id.toString(),
      category: item.category ? {
        _id: item.category._id.toString(),
        name: item.category.name
      } : null,
      // Add display shapes for convenience
      displayShapes: item.shapeType === 'single'
        ? (item.singleShape ? [item.singleShape] : [])
        : (item.shapes || []).map(s => s.shape),
      // Hide price if saleCode is non-numeric (confidential)
      totalPrice: isNaN(parseFloat(item.saleCode)) ? 0 : item.totalPrice
    }));

    res.status(200).json({
      data: transformedItems,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
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

// ==================== GET SINGLE INVENTORY ====================
export const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.ownerId;

    const inventory = await Inventory.findOne({
      _id: id,
      ownerId,
      isDeleted: false
    }).populate('category', 'name');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Transform for frontend
    const transformed = {
      ...inventory.toObject(),
      displayShapes: inventory.shapeType === 'single'
        ? (inventory.singleShape ? [inventory.singleShape] : [])
        : (inventory.shapes || []).map(s => s.shape)
    };

    res.status(200).json({
      success: true,
      data: transformed
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

// ==================== GET SHAPES ====================
export const getAllShapes = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
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

// ==================== CREATE INVENTORY ====================
export const createInventory = async (req, res) => {
  try {
    const {
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
      description,
      images
    } = req.body;

    const ownerId = req.user.ownerId;

    // ==================== VALIDATION ====================
    if (!shapeType || !['single', 'mix'].includes(shapeType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shape type. Must be "single" or "mix"'
      });
    }

    if (shapeType === 'single') {
      if (!singleShape) {
        return res.status(400).json({
          success: false,
          message: 'Single shape name is required for single shape type'
        });
      }

      if (!totalPieces || !totalWeight) {
        return res.status(400).json({
          success: false,
          message: 'Total pieces and weight are required for single shape type'
        });
      }
    }

    if (shapeType === 'mix') {
      if (!shapes || shapes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one shape is required for mix shape type'
        });
      }

      // Validate each shape
      for (const shape of shapes) {
        if (!shape.shape || !shape.pieces || !shape.weight) {
          return res.status(400).json({
            success: false,
            message: 'Each shape must have name, pieces, and weight'
          });
        }
      }
    }

    // ==================== AUTO-GENERATE SERIAL NUMBER ====================
    const serialNumber = await Inventory.generateSerialNumber(category, ownerId);

    // ==================== CREATE INVENTORY DATA ====================
    const inventoryData = {
      serialNumber,
      category: category || null,
      shapeType,
      purchaseCode: purchaseCode || '',
      saleCode: saleCode || '',
      dimensions: dimensions || { length: 0, width: 0, height: 0, unit: 'mm' },
      certification: certification || '',
      location: location || '',
      status: status || 'in_stock',
      description: description || '',
      images: images || [],
      ownerId
    };

    // Set shape-specific data
    if (shapeType === 'single') {
      inventoryData.singleShape = singleShape.trim();
      inventoryData.totalPieces = parseInt(totalPieces) || 0;
      inventoryData.totalWeight = parseFloat(totalWeight) || 0;
      inventoryData.shapes = [];

      // Register shape in master list
      await Shape.getOrCreate(singleShape, ownerId);
    } else {
      inventoryData.singleShape = null;
      inventoryData.shapes = shapes.map(s => ({
        shape: s.shape.trim(),
        pieces: parseInt(s.pieces) || 0,
        weight: parseFloat(s.weight) || 0
      }));

      // Register all shapes in master list
      for (const shape of shapes) {
        await Shape.getOrCreate(shape.shape, ownerId);
      }
      // totals will be calculated in pre-save hook
    }

    // ==================== CREATE AND SAVE ====================
    const inventory = new Inventory(inventoryData);
    await inventory.save();

    // Populate category
    await inventory.populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: inventory
    });
  } catch (error) {
    console.error('Error creating inventory:', error);

    // Handle duplicate serial number (shouldn't happen with auto-gen, but just in case)
    if (error.code === 11000 && error.keyPattern?.serialNumber) {
      return res.status(400).json({
        success: false,
        message: 'Serial number already exists. Please try again.',
        field: 'serialNumber'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create inventory item',
      error: error.message
    });
  }
};

// ==================== UPDATE INVENTORY ====================
export const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const ownerId = req.user.ownerId;
    const userRole = req.user.role;

    // Find inventory
    const inventory = await Inventory.findOne({
      _id: id,
      ownerId,
      isDeleted: false
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // ==================== ROLE-BASED RESTRICTIONS ====================
    if (userRole === 'staff') {
      // Staff can only update limited fields
      const allowedFields = ['status', 'location', 'description', 'images'];
      const attemptedFields = Object.keys(updateData);
      const restrictedFields = attemptedFields.filter(f => !allowedFields.includes(f));

      if (restrictedFields.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Staff cannot update: ${restrictedFields.join(', ')}`
        });
      }

      // Staff can only set status to 'pending'
      if (updateData.status && updateData.status !== 'pending' && updateData.status !== inventory.status) {
        return res.status(403).json({
          success: false,
          message: 'Staff can only mark items as pending'
        });
      }
    }

    // ==================== PREVENT SERIAL NUMBER CHANGES ====================
    if (updateData.serialNumber && updateData.serialNumber !== inventory.serialNumber) {
      return res.status(400).json({
        success: false,
        message: 'Serial number cannot be changed after creation'
      });
    }

    // ==================== UPDATE ALLOWED FIELDS ====================
    const allowedUpdates = [
      'category', 'shapeType', 'singleShape', 'shapes',
      'totalPieces', 'totalWeight', 'purchaseCode', 'saleCode',
      'dimensions', 'certification', 'location', 'status',
      'description', 'images'
    ];

    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        inventory[field] = updateData[field];
      }
    });

    // ==================== POST-UPDATE VALIDATION ====================
    // Validate the final state after applying updates
    if (inventory.shapeType === 'single') {
      if (!inventory.singleShape) {
        return res.status(400).json({
          success: false,
          message: 'Single shape name is required for single shape type'
        });
      }

      if (!inventory.totalPieces || !inventory.totalWeight) {
        return res.status(400).json({
          success: false,
          message: 'Total pieces and weight are required for single shape type'
        });
      }
    }

    if (inventory.shapeType === 'mix') {
      if (!inventory.shapes || inventory.shapes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one shape is required for mix shape type'
        });
      }

      // Validate each shape
      for (const shape of inventory.shapes) {
        if (!shape.shape || !shape.pieces || !shape.weight) {
          return res.status(400).json({
            success: false,
            message: 'Each shape must have name, pieces, and weight'
          });
        }
      }
    }

    // Handle shape-specific data updates
    if (inventory.shapeType === 'single') {
      inventory.singleShape = inventory.singleShape?.trim();
      inventory.totalPieces = parseInt(inventory.totalPieces) || 0;
      inventory.totalWeight = parseFloat(inventory.totalWeight) || 0;
      inventory.shapes = [];

      // Register shape in master list
      if (inventory.singleShape) {
        await Shape.getOrCreate(inventory.singleShape, ownerId);
      }
    } else if (inventory.shapeType === 'mix') {
      inventory.singleShape = null;
      inventory.shapes = inventory.shapes.map(s => ({
        shape: s.shape?.trim(),
        pieces: parseInt(s.pieces) || 0,
        weight: parseFloat(s.weight) || 0
      }));

      // Register all shapes in master list
      for (const shape of inventory.shapes) {
        await Shape.getOrCreate(shape.shape, ownerId);
      }
    }

    // Save (pre-save hook will recalculate totals and price)
    await inventory.save();
    await inventory.populate('category', 'name');

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: inventory
    });
  } catch (error) {
    console.error('Error updating inventory:', error);

    // Handle duplicate serial number (shouldn't happen with auto-gen, but just in case)
    if (error.code === 11000 && error.keyPattern?.serialNumber) {
      return res.status(400).json({
        success: false,
        message: 'Serial number already exists. Please try again.',
        field: 'serialNumber'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item',
      error: error.message
    });
  }
};

// ==================== DELETE INVENTORY ====================
export const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.ownerId;
    const userRole = req.user.role;

    // ADMIN ONLY
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete inventory items'
      });
    }

    const item = await Inventory.findOne({
      _id: id,
      ownerId,
      isDeleted: false
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Move to recycle bin
    await RecycleBin.create({
      entityType: "inventory",
      entityId: item._id,
      entityData: item.toObject(),
      deletedBy: {
        username: req.user.username,
        email: req.user.email,
      },
      ownerId: req.user.ownerId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Actually delete the item from inventory
    await Inventory.findByIdAndDelete(item._id);

    res.status(200).json({
      success: true,
      message: 'Inventory item moved to recycle bin'
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

// ==================== BULK UPDATE ====================
export const bulkUpdateInventory = async (req, res) => {
  try {
    const { ids, updates } = req.body;
    const ownerId = req.user.ownerId;
    const userRole = req.user.role;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items selected'
      });
    }

    // ROLE-BASED RESTRICTIONS
    if (userRole === 'staff') {
      const allowedFields = ['status', 'location'];
      const attemptedFields = Object.keys(updates);
      const restrictedFields = attemptedFields.filter(f => !allowedFields.includes(f));

      if (restrictedFields.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Staff cannot bulk update: ${restrictedFields.join(', ')}`
        });
      }
    }

    // Update items
    const result = await Inventory.updateMany(
      {
        _id: { $in: ids },
        ownerId,
        isDeleted: false
      },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} items updated successfully`,
      data: { updated: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error bulk updating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update',
      error: error.message
    });
  }
};

// ==================== EXPORT INVENTORY ====================

export const exportInventoryExcel = async (req, res) => {
  try {
    const { category, status, shape } = req.query;
    const ownerId = req.user.ownerId;

    // Build query (respect filters)
    const query = { ownerId, isDeleted: false };

    if (category && category !== 'All Categories') {
      query.category = category;
    }

    if (status && status !== 'All Status') {
      query.status = status.toLowerCase().replace(' ', '_');
    }

    if (shape && shape !== 'All Shapes') {
      query.$or = [
        { shapeType: 'single', singleShape: shape },
        { shapeType: 'mix', 'shapes.shape': shape }
      ];
    }

    const items = await Inventory.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Safety check for empty items
    if (!items.length) {
      const buffer = generateExcel([]);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=inventory.xlsx"
      );
      res.send(buffer);
      return;
    }

    // Transform to Excel format
    const excelData = items.map(item => ({
      'Serial Number': item.serialNumber,
      'Category': item.category?.name || 'N/A',
      'Shape Type': item.shapeType,
      'Shapes': item.shapeType === 'single'
        ? item.singleShape
        : item.shapes.map(s => `${s.shape} (${s.pieces}pcs, ${s.weight}ct)`).join('; '),
      'Total Pieces': item.totalPieces,
      'Total Weight (ct)': item.totalWeight,
      'Available Pieces': item.availablePieces,
      'Available Weight (ct)': item.availableWeight,
      'Purchase Code': item.purchaseCode,
      'Sale Code': item.saleCode,
      'Total Price': item.totalPrice,
      'Dimensions': `${item.dimensions?.length || 0} x ${item.dimensions?.width || 0} x ${item.dimensions?.height || 0} ${item.dimensions?.unit || 'mm'}`,
      'Certification': item.certification,
      'Location': item.location,
      'Status': item.status,
      'Description': item.description,
      'Created At': item.createdAt
    }));

    const buffer = generateExcel(excelData);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory.xlsx"
    );

    res.send(buffer);
  } catch (error) {
    console.error('Export inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export inventory',
    });
  }
};

// ==================== IMPORT INVENTORY FROM CSV ====================
export const importInventoryCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded'
      });
    }

    const ownerId = req.user.ownerId;
    const csvContent = req.file.buffer.toString('utf-8');

    let records;
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSV format: ' + parseError.message
      });
    }

    if (!records || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or has no data rows'
      });
    }

    const results = { created: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 for 1-indexed + header row

      try {
        // Map CSV columns to inventory fields (case-insensitive key lookup)
        const get = (key) => {
          const keys = Object.keys(row);
          const match = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === key.toLowerCase().replace(/[\s_-]/g, ''));
          const val = match ? row[match] : undefined;
          return val === '' || val === undefined || val === null ? null : val;
        };

        // Resolve category by name
        let categoryId = null;
        const categoryName = get('category');
        if (categoryName) {
          const cat = await Category.findOne({
            name: { $regex: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            ownerId,
            isDeleted: false
          });
          if (cat) {
            categoryId = cat._id;
          }
        }

        // Determine shape type
        const shapeType = (get('shapetype') || get('shape_type') || 'single').toLowerCase();
        const singleShapeName = get('shape') || get('singleshape') || get('single_shape') || null;

        // Parse numeric values - keep null if missing
        const totalPieces = get('totalpieces') || get('total_pieces') || get('pieces');
        const totalWeight = get('totalweight') || get('total_weight') || get('weight');

        // Generate serial number
        const serialNumber = await Inventory.generateSerialNumber(categoryId, ownerId);

        const inventoryData = {
          serialNumber,
          category: categoryId,
          shapeType: shapeType === 'mix' ? 'mix' : 'single',
          singleShape: shapeType !== 'mix' ? (singleShapeName || null) : null,
          shapes: [],
          totalPieces: totalPieces ? parseInt(totalPieces) || 0 : 0,
          totalWeight: totalWeight ? parseFloat(totalWeight) || 0 : 0,
          purchaseCode: get('purchasecode') || get('purchase_code') || '',
          saleCode: get('salecode') || get('sale_code') || '',
          dimensions: {
            length: parseFloat(get('length') || get('dimensions_length')) || 0,
            width: parseFloat(get('width') || get('dimensions_width')) || 0,
            height: parseFloat(get('height') || get('dimensions_height')) || 0,
            unit: get('unit') || get('dimensions_unit') || 'mm',
          },
          certification: get('certification') || '',
          location: get('location') || '',
          status: get('status') || 'in_stock',
          description: get('description') || '',
          images: [],
          ownerId,
        };

        // Register shape in master list if provided
        if (singleShapeName && shapeType !== 'mix') {
          await Shape.getOrCreate(singleShapeName, ownerId);
        }

        const inventory = new Inventory(inventoryData);
        await inventory.save();
        results.created++;
      } catch (rowError) {
        results.errors.push({
          row: rowNum,
          message: rowError.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${results.created} items. ${results.errors.length} errors.`,
      data: results
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import CSV: ' + error.message
    });
  }
};
