// import * as Inventory from '../models/inventoryModel.js';

// export function getAllItems(req, res, next) {
//   try {
//     const items = Inventory.getAll();
//     res.json(items);
//   } catch (err) {
//     next(err);
//   }
// }

// export function getItemById(req, res, next) {
//   try {
//     const item = Inventory.getById(req.params.id);
//     if (!item) return res.status(404).json({ message: 'Item not found' });
//     res.json(item);
//   } catch (err) {
//     next(err);
//   }
// }

// export function createItem(req, res, next) {
//   try {
//     const created = Inventory.create(req.body);
//     res.status(201).json(created);
//   } catch (err) {
//     if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
//       err.status = 409;
//       err.message = 'Serial Number must be unique';
//     }
//     next(err);
//   }
// }

// export function updateItem(req, res, next) {
//   try {
//     const changes = Inventory.update(req.params.id, req.body);
//     if (changes === 0) return res.status(404).json({ message: 'Item not found' });
//     res.json({ message: 'Item updated' });
//   } catch (err) {
//     next(err);
//   }
// }

// export function deleteItem(req, res, next) {
//   try {
//     const changes = Inventory.remove(req.params.id);
//     if (changes === 0) return res.status(404).json({ message: 'Item not found' });
//     res.json({ message: 'Item deleted' });
//   } catch (err) {
//     next(err);
//   }
// }

import Sold from "../models/soldModel.js";
import Invoice from "../models/Invoice.js";
import multer from "multer";
import Inventory from "../models/inventoryModel.js";
import RecycleBin from "../models/recycleBinModel.js";
import { generateValidationReport } from "../utils/excel.js";
import { parseExcel, generateExcel } from "../utils/excel.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";


const upload = multer({ storage: multer.memoryStorage() });
export const importMiddleware = upload.single("file");

export const previewInventoryExcel = async (req, res) => {
  try {
    const rows = parseExcel(req.file.buffer);

    const preview = [];

    for (const row of rows) {
      const exists = await Inventory.findOne({
        serialNumber: row.serialNumber,
        ownerId: req.user.ownerId,
      });

      preview.push({
        ...row,
        isDuplicate: !!exists,
        isValid:
          row.serialNumber &&
          row.category &&
          row.pieces &&
          row.weight &&
          row.purchaseCode &&
          row.saleCode,
      });
    }

    res.json({
      success: true,
      data: preview,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to preview excel",
    });
  }
};

export const bulkUpdateInventory = async (req, res) => {
  const { ids, updates } = req.body;

  if (!ids?.length || !updates) {
    return res.status(400).json({
      success: false,
      message: "Invalid bulk update payload",
    });
  }

  await Inventory.updateMany(
    { _id: { $in: ids }, ownerId: req.user.ownerId },
    { $set: updates }
  );

  res.json({
    success: true,
    message: "Bulk update successful",
  });
};

// Separate function for import with duplicate checking (for direct import)
export const importInventoryFromExcel = async (req, res) => {
  try {
    const rows = parseExcel(req.file.buffer);

    let inserted = 0;
    let skipped = 0;
    const report = [];

    for (const row of rows) {
      if (
        !row.serialNumber ||
        !row.category ||
        !row.pieces ||
        !row.weight ||
        !row.purchaseCode ||
        !row.saleCode
      ) {
        skipped++;
        report.push({ ...row, status: "INVALID" });
        continue;
      }

      const categoryDoc = await Category.findOne({
        name: new RegExp(`^${row.category}$`, "i"),
        isDeleted: false,
      });

      if (!categoryDoc) {
        skipped++;
        report.push({ ...row, status: "INVALID", reason: "Category not found" });
        continue;
      }

      const exists = await Inventory.findOne({
        serialNumber: row.serialNumber,
        ownerId: req.user.ownerId,
        isDeleted: false,
      });

      if (exists) {
        skipped++;
        report.push({ ...row, status: "DUPLICATE" });
        continue;
      }

      await Inventory.create({
        serialNumber: row.serialNumber,
        category: categoryDoc._id,
        shapes: [{ name: "Default", pieces: row.pieces, weight: row.weight }],
        totalPieces: row.pieces,
        availablePieces: row.pieces,
        totalWeight: row.weight,
        availableWeight: row.weight,
        weightUnit: row.weightUnit || "carat",
        purchaseCode: row.purchaseCode,
        saleCode: row.saleCode,
        status: row.status || "pending",
        ownerId: req.user.ownerId,
        dimensions: {
          length: row.length,
          width: row.width,
          height: row.height,
          unit: row.dimensionUnit || "mm",
        },
      });

      inserted++;
      report.push({ ...row, status: "INSERTED" });
    }

    res.json({
      success: true,
      inserted,
      skipped,
      report,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Import failed",
    });
  }
};

// Separate function for confirmed import (skips duplicate checking)
export const confirmInventoryImport = async (req, res) => {
  try {
    const rows = parseExcel(req.file.buffer);

    let inserted = 0;
    let skipped = 0;
    const report = [];

    for (const row of rows) {
      if (
        !row.serialNumber ||
        !row.category ||
        !row.pieces ||
        !row.weight ||
        !row.purchaseCode ||
        !row.saleCode
      ) {
        skipped++;
        report.push({ ...row, status: "INVALID" });
        continue;
      }

      const categoryDoc = await Category.findOne({
        name: new RegExp(`^${row.category}$`, "i"),
        isDeleted: false,
      });

      if (!categoryDoc) {
        skipped++;
        report.push({ ...row, status: "INVALID", reason: "Category not found" });
        continue;
      }

      await Inventory.create({
        serialNumber: row.serialNumber,
        category: categoryDoc._id,
        shapes: [{ name: "Default", pieces: row.pieces, weight: row.weight }],
        totalPieces: row.pieces,
        availablePieces: row.pieces,
        totalWeight: row.weight,
        availableWeight: row.weight,
        weightUnit: row.weightUnit || "carat",
        purchaseCode: row.purchaseCode,
        saleCode: row.saleCode,
        status: row.status || "pending",
        ownerId: req.user.ownerId,
        dimensions: {
          length: row.length,
          width: row.width,
          height: row.height,
          unit: row.dimensionUnit || "mm",
        },
      });

      inserted++;
      report.push({ ...row, status: "INSERTED" });
    }

    res.json({
      success: true,
      inserted,
      skipped,
      report,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Import failed",
    });
  }
};


export const exportInventoryToExcel = async (req, res) => {
  const inventory = await Inventory.find({
    isDeleted: false,
    ownerId: req.user.ownerId,
  }).populate("category");

  const data = inventory.map((i) => ({
    serialNumber: i.serialNumber,
    category: i.category?.name,
    pieces: i.totalPieces,
    weight: i.totalWeight,
    weightUnit: i.weightUnit,
    purchaseCode: i.purchaseCode,
    saleCode: i.saleCode,
    status: i.status,
  }));

  const file = generateExcel(data);

  res.setHeader("Content-Disposition", "attachment; filename=inventory.xlsx");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.send(file);
};

/* GET ALL */
export const getInventory = async (req, res) => {
  try {
   const {
  search = "",
  category,
  status,
  page = 1,
  limit = 20,
  sortBy,
  sortOrder,
} = req.query;

const sortField = sortBy || "createdAt";
const sortDir = sortOrder === "asc" ? 1 : -1;

const sortQuery = { [sortField]: sortDir };

    const query = {
      ownerId: req.user.ownerId,
      isDeleted: false,
    };

    /* 🔍 SEARCH */
    if (search) {
      query.$or = [
        { serialNumber: { $regex: search, $options: "i" } },
        { purchaseCode: { $regex: search, $options: "i" } },
        { saleCode: { $regex: search, $options: "i" } },
        { certification: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    /* 📦 CATEGORY FILTER */
    

if (category && mongoose.Types.ObjectId.isValid(category)) {
  query.category = category;
}

    /* 📌 STATUS FILTER */
    if (status && status !== "all") {
      if (status === "partially_sold") {
        query.status = "partially_sold";
      } else {
        query.status = status;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    /* 🔃 SORTING */
// const sortField = req.query.sortBy || "createdAt";
// const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

// const sortQuery = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      Inventory.find(query)
        .populate("category", "name")
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit)),
      Inventory.countDocuments(query),
    ]);

    res.json({
      data: items,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Inventory fetch error:", err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};


/* =========================
   CREATE INVENTORY ITEM (WITH SHAPES)
========================= */
export const createInventoryItem = async (req, res, next) => {
  try {
    const {
      serialNumber,
      category,
      shapes, // NEW: Array of { name, pieces, weight }
      pieces,
      weight,
      totalPieces,
      totalWeight,
      weightUnit,
      purchaseCode,
      saleCode,
      dimensions,
      location,
      certification,
      status,
      description,
      images,
    } = req.body;

    // ✅ HANDLE SHAPES OR FALLBACK TO SINGLE ENTRY
    let finalShapes;

    if (shapes && Array.isArray(shapes) && shapes.length > 0) {
      // User provided shapes array
      finalShapes = shapes;
    } else {
      // Backward compatibility: create single shape from pieces/weight
      const finalPieces = Number(pieces ?? totalPieces);
      const finalWeight = Number(weight ?? totalWeight);

      finalShapes = [{
        name: "Default",
        pieces: finalPieces,
        weight: finalWeight,
      }];
    }

    // ✅ CALCULATE TOTALS FROM SHAPES
    const calculatedTotalPieces = finalShapes.reduce((sum, s) => sum + Number(s.pieces), 0);
    const calculatedTotalWeight = finalShapes.reduce((sum, s) => sum + Number(s.weight), 0);

    if (!serialNumber || !category || !weightUnit || !purchaseCode || !saleCode) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const ownerId = req.user.ownerId;

    const item = await Inventory.create({
      serialNumber,
      category,
      shapes: finalShapes,
      totalPieces: calculatedTotalPieces,
      availablePieces: calculatedTotalPieces,
      totalWeight: calculatedTotalWeight,
      availableWeight: calculatedTotalWeight,
      weightUnit,
      purchaseCode,
      saleCode,
      dimensions,
      location,
      certification,
      status,
      description,
      images,
      ownerId,
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.serialNumber) {
      return res.status(409).json({
        success: false,
        message: "Inventory item with this serial number already exists",
        field: "serialNumber",
      });
    }

    next(err);
  }
};


/* =========================
   UPDATE INVENTORY ITEM (WITH SHAPES)
========================= */
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // ✅ RECALCULATE TOTALS IF SHAPES CHANGED
    if (updateData.shapes && Array.isArray(updateData.shapes)) {
      updateData.totalPieces = updateData.shapes.reduce((sum, s) => sum + Number(s.pieces), 0);
      updateData.totalWeight = updateData.shapes.reduce((sum, s) => sum + Number(s.weight), 0);

      // Preserve available quantities if not explicitly set
      if (updateData.availablePieces === undefined) {
        updateData.availablePieces = updateData.totalPieces;
      }
      if (updateData.availableWeight === undefined) {
        updateData.availableWeight = updateData.totalWeight;
      }
    }

    // Handle old field names (backward compatibility)
    if (updateData.pieces !== undefined && !updateData.shapes) {
      updateData.totalPieces = updateData.pieces;
      if (updateData.availablePieces === undefined) {
        updateData.availablePieces = updateData.pieces;
      }
      delete updateData.pieces;
    }

    if (updateData.weight !== undefined && !updateData.shapes) {
      updateData.totalWeight = updateData.weight;
      if (updateData.availableWeight === undefined) {
        updateData.availableWeight = updateData.weight;
      }
      delete updateData.weight;
    }

    const updated = await Inventory.findOneAndUpdate(
      {
        _id: id,
        ownerId: req.user.ownerId,
        isDeleted: false, // ✅ Cannot update deleted items
      },
      {
        ...updateData,
        dimensions: updateData.dimensions,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.serialNumber) {
      return res.status(409).json({
        success: false,
        message: "Serial number already exists",
        field: "serialNumber",
      });
    }

    console.error("Update inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update inventory item",
    });
  }
};

/* =========================
   SOFT DELETE INVENTORY ITEM
========================= */
export async function deleteInventoryItem(req, res, next) {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findOne({
      _id: id,
      ownerId: req.user.ownerId,
      isDeleted: false,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    // ✅ MOVE TO RECYCLE BIN
    await RecycleBin.create({
      entityType: "inventory",
      entityId: inventory._id,
      entityData: inventory.toObject(),
      deletedBy: req.user.id,
      ownerId: req.user.ownerId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // ✅ SOFT DELETE
    inventory.isDeleted = true;
    inventory.deletedAt = new Date();
    inventory.deletedBy = req.user.id;
    await inventory.save();

    res.json({
      success: true,
      message: "Item moved to recycle bin",
    });
  } catch (err) {
    next(err);
  }
}

export const downloadImportReport = async (req, res) => {
  const buffer = generateValidationReport(req.body.rows);

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=import-report.xlsx"
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.send(buffer);
};

/* =========================
   GET SELLABLE INVENTORY
========================= */
export const getSellableInventory = async (req, res) => {
  try {
    const items = await Inventory.find({
      status: { $in: ["in_stock", "pending", "partially_sold"] },
      isDeleted: false, // ✅ EXCLUDE DELETED
      ownerId: req.user.ownerId,
    })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: items,
    });
  } catch (err) {
    console.error("Get sellable inventory error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sellable inventory",
    });
  }
};
