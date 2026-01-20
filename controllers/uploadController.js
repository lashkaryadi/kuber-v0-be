import fs from "fs";
import path from "path";
import Inventory from "../models/Inventory.js";
import process from "process";

export const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  res.status(201).json({
    success: true,
    url: `/uploads/${req.file.filename}`,
  });
};

export const deleteImage = async (req, res) => {
  const { imageUrl, inventoryId } = req.body;

  if (!imageUrl || !inventoryId) {
    return res.status(400).json({ message: "Missing data" });
  }

  const inventory = await Inventory.findOne({
    _id: inventoryId,
    ownerId: req.user.ownerId,
  });

  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  // 🔥 Remove from DB
  inventory.images = inventory.images.filter((img) => img !== imageUrl);
  await inventory.save();

  // 🔥 Delete file
  const filePath = path.join(process.cwd(), imageUrl);

  fs.unlink(filePath, (err) => {
    if (err) console.error("File delete failed:", err);
  });

  res.json({ success: true });
};