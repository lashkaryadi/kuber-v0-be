// Test script for shape-based inventory functionality
import mongoose from 'mongoose';
import Inventory from './models/Inventory.js';
import Category from './models/Category.js';
import User from './models/User.js';

async function testShapeBasedInventory() {
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
      description: 'Test category for shape-based inventory',
      ownerId: testUser._id
    });

    console.log('Testing shape-based inventory functionality...\n');

    // Test 1: Create inventory item with shapes
    console.log('1. Creating inventory item with shapes...');
    const inventoryWithShapes = new Inventory({
      serialNumber: 'TEST-SHAPE-001',
      category: testCategory._id,
      shapes: [
        { name: 'Round', pieces: 10, weight: 5.5 },
        { name: 'Square', pieces: 5, weight: 3.2 }
      ],
      totalPieces: 0,  // Will be calculated by middleware
      availablePieces: 0,  // Will be calculated by middleware
      totalWeight: 0,  // Will be calculated by middleware
      availableWeight: 0,  // Will be calculated by middleware
      weightUnit: 'carat',
      purchaseCode: 'PURCHASE-001',
      saleCode: 'SALE-001',
      ownerId: testUser._id
    });
    await inventoryWithShapes.save();

    console.log('Created inventory with shapes:', JSON.stringify(inventoryWithShapes.toObject(), null, 2));

    // Verify calculated totals
    console.log('\nCalculated totals:');
    console.log('Total Pieces:', inventoryWithShapes.totalPieces); // Should be 15 (10+5)
    console.log('Total Weight:', inventoryWithShapes.totalWeight); // Should be 8.7 (5.5+3.2)
    console.log('Available Pieces:', inventoryWithShapes.availablePieces); // Should be 15
    console.log('Available Weight:', inventoryWithShapes.availableWeight); // Should be 8.7

    // Test 2: Create inventory item with backward compatibility (converted to shapes)
    console.log('\n2. Creating inventory item with backward compatibility (converted to shapes)...');
    const inventoryLegacy = new Inventory({
      serialNumber: 'TEST-LEGACY-001',
      category: testCategory._id,
      shapes: [
        { name: 'Default', pieces: 8, weight: 4.0 }  // Converted from legacy fields
      ],
      totalPieces: 0,  // Will be calculated by middleware
      availablePieces: 0,  // Will be calculated by middleware
      totalWeight: 0,  // Will be calculated by middleware
      availableWeight: 0,  // Will be calculated by middleware
      weightUnit: 'carat',
      purchaseCode: 'PURCHASE-002',
      saleCode: 'SALE-002',
      ownerId: testUser._id
    });
    await inventoryLegacy.save();

    console.log('Created legacy inventory:', JSON.stringify(inventoryLegacy.toObject(), null, 2));

    // Verify that legacy fields were converted to shapes
    console.log('\nLegacy item shapes:', inventoryLegacy.shapes);
    console.log('Total Pieces:', inventoryLegacy.totalPieces); // Should be 8
    console.log('Total Weight:', inventoryLegacy.totalWeight); // Should be 4.0

    // Test 3: Update inventory with shapes
    console.log('\n3. Updating inventory with new shapes...');
    const updatedInventory = await Inventory.findByIdAndUpdate(
      inventoryWithShapes._id,
      {
        shapes: [
          { name: 'Round', pieces: 15, weight: 7.5 },
          { name: 'Square', pieces: 8, weight: 4.2 },
          { name: 'Rectangle', pieces: 3, weight: 1.8 }
        ]
      },
      { new: true }
    );

    console.log('Updated inventory:', JSON.stringify(updatedInventory.toObject(), null, 2));
    console.log('New Total Pieces:', updatedInventory.totalPieces); // Should be 26 (15+8+3)
    console.log('New Total Weight:', updatedInventory.totalWeight); // Should be 13.5 (7.5+4.2+1.8)

    console.log('\n✅ Shape-based inventory functionality test completed successfully!');
    
    // Clean up
    await Inventory.deleteMany({ ownerId: testUser._id });
    await Category.deleteMany({ ownerId: testUser._id });
    await User.deleteMany({ email: 'test@example.com' });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testShapeBasedInventory();
