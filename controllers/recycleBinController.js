import RecycleBin from "../models/recycleBinModel.js";
import Inventory from "../models/inventoryModel.js";
import Category from "../models/Category.js";

/* =========================
   GET RECYCLE BIN ITEMS
========================= */
export const getRecycleBinItems = async (req, res) => {
  try {
    const {
      entityType, // "inventory" or "category"
      page = 1,
      limit = 20,
      search = "",
    } = req.query;

    const query = {
      ownerId: req.user.ownerId,
    };

    if (entityType && entityType !== "all") {
      query.entityType = entityType;
    }

    // Search in entityData
    if (search) {
      query.$or = [
        { "entityData.serialNumber": { $regex: search, $options: "i" } },
        { "entityData.name": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      RecycleBin.find(query)
        .populate("deletedBy", "username email")
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      RecycleBin.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get recycle bin error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recycle bin items",
    });
  }
};

/* =========================
   RESTORE ITEMS
========================= */
export const restoreItems = async (req, res) => {
  try {
    const { ids } = req.body; // Array of recycle bin IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items selected for restore",
      });
    }

    const recycleBinItems = await RecycleBin.find({
      _id: { $in: ids },
      ownerId: req.user.ownerId,
    });

    if (recycleBinItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No items found",
      });
    }

    let restored = 0;
    let failed = 0;

    for (const item of recycleBinItems) {
      try {
        if (item.entityType === "inventory") {
          // Restore inventory item
          await Inventory.findByIdAndUpdate(item.entityId, {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
          });
        } else if (item.entityType === "category") {
          // Restore category
          await Category.findByIdAndUpdate(item.entityId, {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
          });
        }

        // Remove from recycle bin
        await RecycleBin.findByIdAndDelete(item._id);
        restored++;
      } catch (err) {
        console.error(`Failed to restore item ${item._id}:`, err);
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Restored ${restored} item(s)${failed > 0 ? `, ${failed} failed` : ""}`,
      restored,
      failed,
    });
  } catch (err) {
    console.error("Restore items error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to restore items",
    });
  }
};

/* =========================
   PERMANENTLY DELETE ITEMS
========================= */
export const permanentlyDeleteItems = async (req, res) => {
  try {
    const { ids } = req.body; // Array of recycle bin IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items selected for deletion",
      });
    }

    const recycleBinItems = await RecycleBin.find({
      _id: { $in: ids },
      ownerId: req.user.ownerId,
    });

    if (recycleBinItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No items found",
      });
    }

    let deleted = 0;
    let failed = 0;

    for (const item of recycleBinItems) {
      try {
        if (item.entityType === "inventory") {
          // Permanently delete inventory item
          await Inventory.findByIdAndDelete(item.entityId);
        } else if (item.entityType === "category") {
          // Permanently delete category
          await Category.findByIdAndDelete(item.entityId);
        }

        // Remove from recycle bin
        await RecycleBin.findByIdAndDelete(item._id);
        deleted++;
      } catch (err) {
        console.error(`Failed to delete item ${item._id}:`, err);
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deleted} item(s)${failed > 0 ? `, ${failed} failed` : ""}`,
      deleted,
      failed,
    });
  } catch (err) {
    console.error("Permanently delete items error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete items",
    });
  }
};

/* =========================
   EMPTY RECYCLE BIN
========================= */
export const emptyRecycleBin = async (req, res) => {
  try {
    const { entityType } = req.body; // Optional: "inventory", "category", or undefined for all

    const query = {
      ownerId: req.user.ownerId,
    };

    if (entityType) {
      query.entityType = entityType;
    }

    // Get all items to permanently delete
    const items = await RecycleBin.find(query);

    let deleted = 0;
    let failed = 0;

    for (const item of items) {
      try {
        if (item.entityType === "inventory") {
          await Inventory.findByIdAndDelete(item.entityId);
        } else if (item.entityType === "category") {
          await Category.findByIdAndDelete(item.entityId);
        }

        await RecycleBin.findByIdAndDelete(item._id);
        deleted++;
      } catch (err) {
        console.error(`Failed to delete item ${item._id}:`, err);
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Emptied recycle bin: ${deleted} deleted${failed > 0 ? `, ${failed} failed` : ""}`,
      deleted,
      failed,
    });
  } catch (err) {
    console.error("Empty recycle bin error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to empty recycle bin",
    });
  }
};
