import Sale from "../models/Sale.js";
// import Inventory from "../models/Inventory.js";
import mongoose from "mongoose";

export const getProfitAnalytics = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.ownerId);

    // ======================
    // TOTAL METRICS
    // ======================
    const totals = await Sold.aggregate([
      { $match: { ownerId } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$price" },
          cost: { $sum: "$costPrice" },
          profit: { $sum: "$profit" },
          count: { $sum: 1 },
        },
      },
    ]);

    // ======================
    // MONTHLY PROFIT
    // ======================
    const monthly = await Sold.aggregate([
      { $match: { ownerId } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$price" },
          profit: { $sum: "$profit" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // ======================
    // TOP CATEGORIES
    // ======================
    const categories = await Sold.aggregate([
      { $match: { ownerId } },
      {
        $lookup: {
          from: "inventories",
          localField: "inventoryItem",
          foreignField: "_id",
          as: "inventory",
        },
      },
      { $unwind: "$inventory" },
      {
        $lookup: {
          from: "categories",
          localField: "inventory.category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $group: {
          _id: { $arrayElemAt: ["$category.name", 0] },
          revenue: { $sum: "$price" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totals: totals[0] || {},
      monthly,
      categories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
};

// Additional analytics functions can be added here
export const getMonthlyProfitAnalytics = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.ownerId);

    const data = await Sold.aggregate([
      { $match: { ownerId } },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          revenue: { $sum: "$price" },
          cost: { $sum: "$costPrice" },
          profit: { $sum: "$profit" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    res.json(data);
  } catch (error) {
    console.error("Monthly profit analytics error:", error);
    res.status(500).json({ message: "Failed to fetch monthly profit analytics" });
  }
};

export const getCategoryProfitAnalytics = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.ownerId);

    const data = await Sold.aggregate([
      { $match: { ownerId } },
      {
        $lookup: {
          from: "inventories",
          localField: "inventoryItem",
          foreignField: "_id",
          as: "inventoryDetails"
        }
      },
      { $unwind: "$inventoryDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "inventoryDetails.category",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ["$categoryDetails.name", 0] },
          revenue: { $sum: "$price" },
          cost: { $sum: "$costPrice" },
          profit: { $sum: "$profit" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { profit: -1 }
      }
    ]);

    res.json(data);
  } catch (error) {
    console.error("Category profit analytics error:", error);
    res.status(500).json({ message: "Failed to fetch category profit analytics" });
  }
};

import ExcelJS from "excel";

export const exportProfitExcel = async (req, res) => {
  try {
    const sold = await Sold.find({ ownerId: req.user.ownerId }).populate('inventoryItem');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Profit Report");

    sheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Item", key: "item", width: 20 },
      { header: "Revenue", key: "revenue", width: 15 },
      { header: "Cost", key: "cost", width: 15 },
      { header: "Profit", key: "profit", width: 15 },
    ];

    sold.forEach((s) => {
      sheet.addRow({
        date: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
        item: s.inventoryItem?.serialNumber || s.inventoryItem?._id?.toString() || 'N/A',
        revenue: s.price,
        cost: s.costPrice,
        profit: s.profit,
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=profit-report.xlsx"
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export profit excel error:", error);
    res.status(500).json({ message: "Failed to export profit report" });
  }
};
