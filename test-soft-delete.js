import mongoose from 'mongoose';
import Inventory from './models/inventoryModel.js';
import Category from './models/Category.js';
import User from './models/User.js';
import RecycleBin from './models/recycleBinModel.js';

async function testSoftDeleteFunctionality() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/gemstone-inventory-test');

    // Create a test user
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });

    // Create a test category
    const testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test category for soft delete',
      ownerId: testUser._id
    });

    console.log('Testing soft delete functionality...\n');

    // Create an inventory item
    console.log('1. Creating inventory item...');
    const inventoryItem = new Inventory({
      serialNumber: 'SOFT-DELETE-TEST-001',
      category: testCategory._id,
      shapes: [
        { name: 'Round', pieces: 10, weight: 5.5 }
      ],
      totalPieces: 0,
      availablePieces: 0,
      totalWeight: 0,
      availableWeight: 0,
      weightUnit: 'carat',
      purchaseCode: 'PURCHASE-001',
      saleCode: 'SALE-001',
      ownerId: testUser._id
    });
    await inventoryItem.save();

    console.log('Created inventory item:', inventoryItem.serialNumber);
    console.log('Is deleted?', inventoryItem.isDeleted); // Should be false

    // Verify the item exists in the inventory
    const existingItem = await Inventory.findOne({ serialNumber: 'SOFT-DELETE-TEST-001', ownerId: testUser._id });
    console.log('Item exists in inventory?', !!existingItem); // Should be true

    // Perform soft delete
    console.log('\n2. Performing soft delete...');
    inventoryItem.isDeleted = true;
    inventoryItem.deletedAt = new Date();
    inventoryItem.deletedBy = testUser._id;
    await inventoryItem.save();

    console.log('Item marked as deleted:', inventoryItem.isDeleted); // Should be true
    console.log('Deleted at:', inventoryItem.deletedAt);

    // Verify the item is marked as deleted but still exists
    const deletedItem = await Inventory.findOne({ serialNumber: 'SOFT-DELETE-TEST-001', ownerId: testUser._id });
    console.log('Item still exists in DB?', !!deletedItem); // Should be true
    console.log('Item is marked as deleted?', deletedItem?.isDeleted); // Should be true

    // Verify the item doesnt appear when querying non-deleted items
    const nonDeletedItems = await Inventory.find({ 
      serialNumber: 'SOFT-DELETE-TEST-001', 
      ownerId: testUser._id,
      isDeleted: false 
    });
    console.log('Item appears in non-deleted query?', nonDeletedItems.length > 0); // Should be false

    // Move the item to the recycle bin
    console.log('\n3. Moving item to recycle bin...');
    await RecycleBin.create({
      entityType: 'inventory',
      entityId: inventoryItem._id,
      entityData: inventoryItem.toObject(),
      deletedBy: testUser._id,
      ownerId: testUser._id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Verify the item is in the recycle bin
    const recycleBinItem = await RecycleBin.findOne({ 
      entityId: inventoryItem._id,
      ownerId: testUser._id 
    });
    console.log('Item in recycle bin?', !!recycleBinItem); // Should be true
    console.log('Entity type:', recycleBinItem?.entityType); // Should be 'inventory'

    console.log('\n✅ Soft delete functionality test completed successfully!');

    // Clean up
    await Inventory.deleteMany({ ownerId: testUser._id });
    await Category.deleteMany({ ownerId: testUser._id });
    await RecycleBin.deleteMany({ ownerId: testUser._id });
    await User.deleteMany({ email: 'test@example.com'});

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSoftDeleteFunctionality();
