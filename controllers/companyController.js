import Company from "../models/Company.js";

export const getCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ ownerId: req.user.ownerId });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch company" });
  }
};

export const saveCompany = async (req, res) => {
  try {
    const payload = {
      ownerId: req.user.ownerId,
      ...req.body,
    };

    const company = await Company.findOneAndUpdate(
      { ownerId: req.user.ownerId },
      payload,
      { upsert: true, new: true }
    );

    res.json(company);
  } catch (error) {
    res.status(500).json({ message: "Failed to save company" });
  }
};