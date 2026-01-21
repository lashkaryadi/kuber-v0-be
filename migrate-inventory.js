import mongoose from "mongoose";
import dotenv from "dotenv";
import Inventory from "./models/Inventory.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kuber");
    console.log(`MongoDB Connected: \${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

const migrateInventoryData = async () => {
  try {
    console.log("Starting inventory data migration...");
    
    // Update existing inventory items to use new schema fields
    const result = await Inventory.updateMany(
      {}, // Match all documents
      [
        {
          $set: {
            totalPieces: "$$pieces",
            availablePieces: "$$pieces",
            totalWeight: "$$weight",
            availableWeight: "$$weight",
          }
        }
      ]
    );

    console.log(`Migration completed: ${result.modifiedCount} documents updated`);

    // Verify the migration
    const sample = await Inventory.findOne({});
    if (sample) {
      console.log("Sample document after migration:", {
        id: sample._id,
        totalPieces: sample.totalPieces,
        availablePieces: sample.availablePieces,
        totalWeight: sample.totalWeight,
        availableWeight: sample.availableWeight,
        pieces: sample.pieces, // This should be undefined after migration
        weight: sample.weight, // This should be undefined after migration
      });
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
};

const runMigration = async () => {
  try {
    await connectDB();
    await migrateInventoryData();
    console.log("Migration script completed successfully!");
  } catch (error) {
    console.error("Script error:", error);
  } finally {
    process.exit(0);
  }
};

runMigration();
