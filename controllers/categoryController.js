// import Category from "../models/Category.js";

// // GET
// export const getCategories = async (req, res) => {
//   const categories = await Category.find().sort({ createdAt: -1 });

//   res.json(
//     categories.map((cat) => ({
//       id: cat._id.toString(),   // 🔥 MOST IMPORTANT LINE
//       name: cat.name,
//       description: cat.description,
//       createdAt: cat.createdAt,
//     }))
//   );
// };


// // CREATE
// export const createCategory = async (req, res) => {
//   const { name, description } = req.body;

//   if (!name) {
//     return res.status(400).json({ message: "Category name required" });
//   }

//   const category = await Category.create({
//     name,
//     description,
//     createdBy: req.user._id,
//   });

//   res.status(201).json({
//     id: category._id.toString(),
//     name: category.name,
//     description: category.description,
//     createdAt: category.createdAt,
//   });
// };



// // UPDATE
// export const updateCategory = async (req, res) => {
//   const category = await Category.findByIdAndUpdate(
//     req.params.id,
//     req.body,
//     { new: true }
//   );

//   res.json({
//     id: category._id.toString(),
//     name: category.name,
//     description: category.description,
//     createdAt: category.createdAt,
//   });
// };


// // DELETE
// export const deleteCategory = async (req, res) => {
//   const { id } = req.params;

//   if (!id || id === "undefined") {
//     return res.status(400).json({ message: "Invalid category ID" });
//   }

//   await Category.findByIdAndDelete(id);
//   res.json({ success: true });
// };
import Inventory from "../models/Inventory.js";
import Category from "../models/Category.js";
import RecycleBin from "../models/RecycleBin.js";
import { generateExcel } from "../utils/excel.js";

/* =========================
   GET ALL CATEGORIES (EXCLUDE DELETED)
========================= */
export const getCategories = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    // Validate pagination parameters to prevent resource exhaustion
    const pageNum = Number(page);
    const limitNum = Number(limit);

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

    const query = {
      ownerId: req.user.ownerId,
      isDeleted: false, // ✅ EXCLUDE DELETED
    };

    if (search) {
      // Validate search length to prevent ReDoS attacks
      if (typeof search !== 'string' || search.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be a string with maximum 50 characters'
        });
      }

      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum),
      Category.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: categories.map(cat => ({
        _id: cat._id.toString(),
        name: cat.name,
      })),
      meta: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/* CREATE */
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const cleanName = name.trim().toUpperCase();

    // 🔒 STRICT DUPLICATE CHECK (case-insensitive, non-deleted)
    const exists = await Category.findOne({
      ownerId: req.user.ownerId,
      name: cleanName,
      isDeleted: false,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    const code = cleanName.substring(0, 2);

    const category = await Category.create({
      name: cleanName,
      code,
      description,
      ownerId: req.user.ownerId,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    // Mongo duplicate fallback (extra safety)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* UPDATE */
export const updateCategory = async (req, res) => {
  const { name, description } = req.body;

  const category = await Category.findOne({
    _id: req.params.id,
    ownerId: req.user.ownerId
  });
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.name = name ?? category.name;
  category.description = description ?? category.description;

  await category.save();
  res.json(category);
};

/* =========================
   DELETE CATEGORY
========================= */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findOne({
      _id: id,
      ownerId: req.user.ownerId,
      isDeleted: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category is used in inventory
    const used = await Inventory.exists({
      category: id,
      isDeleted: false // Only check non-deleted inventory items
    });

    if (used) {
      return res.status(400).json({
        success: false,
        message: "Category is used in inventory and cannot be deleted",
      });
    }

    // Move to recycle bin
    await RecycleBin.create({
      entityType: "category",
      entityId: category._id,
      entityData: category.toObject(),
      deletedBy: {
        username: req.user.username,
        email: req.user.email,
      },
      ownerId: req.user.ownerId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Actually delete the category from the database
    await Category.findByIdAndDelete(category._id);

    res.json({
      success: true,
      message: "Category moved to recycle bin",
    });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

/* EXPORT CATEGORIES TO EXCEL */
export const exportCategoriesToExcel = async (req, res) => {
  try {
    const categories = await Category.find({ ownerId: req.user.ownerId });

    const data = categories.map((c) => ({
      Name: c.name,
      Description: c.description || "",
      CreatedAt: c.createdAt,
    }));

    const buffer = generateExcel(data);

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=categories.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (err) {
    console.error("Export categories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to export categories",
    });
  }
};





