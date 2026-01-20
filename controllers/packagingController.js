import Packaging from "../models/packagingModel.js";
import inventoryModel from "../models/Inventory.js";

export const createPackaging = async (req, res) => {
  const { clientName, items } = req.body;

  // lock inventory
  for (const item of items) {
    await inventoryModel.findByIdAndUpdate(item.inventory, {
      status: "packed",
    });
  }

  const packaging = await Packaging.create({
    clientName,
    items,
    createdBy: req.user.id,
  });

  res.status(201).json(packaging);
};
