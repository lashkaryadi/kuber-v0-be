import mongoose from 'mongoose';
import Category from './models/Category.js';
import User from './models/User.js';
import RecycleBin from './models/recycleBinModel.js';

async function testCategorySoftDeleteFunctionality() {
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

    console.log('Testing category soft delete functionality...\n');

    // Create a category
    console.log('1. Creating category...');
    const category = new Category({
      name: 'Test Category',
      description: 'Test category for soft delete',
      ownerId: testUser._id
    });
    await category.save();

    console.log('Created category:', category.name);
    console.log('Is deleted?', category.isDeleted); // Should be false

    // Verify the category exists
    const existingCategory = await Category.findOne({ name: 'Test Category', ownerId: testUser._id });
    console.log('Category exists in DB?', !!existingCategory); // Should be true

    // Perform soft delete
    console.log('\n2. Performing soft delete...');
    category.isDeleted = true;
    category.deletedAt = new Date();
    category.deletedBy = testUser._id;
    await category.save();

    console.log('Category marked as deleted:', category.isDeleted); // Should be true
    console.log('Deleted at:', category.deletedAt);

    // Verify the category is marked as deleted but still exists
    const deletedCategory = await Category.findOne({ name: 'Test Category', ownerId: testUser._id });
    console.log('Category still exists in DB?', !!deletedCategory); // Should be true
    console.log('Category is marked as deleted?', deletedCategory?.isDeleted); // Should be true

    // Verify the category doesn't appear when querying non-deleted categories
    const nonDeletedCategories = await Category.find({ 
      name: 'Test Category', 
      ownerId: testUser._id,
      isDeleted: false 
    });
    console.log('Category appears in non-deleted query?', nonDeletedCategories.length > 0); // Should be false

    // Move the category to the recycle bin
    console.log('\n3. Moving category to recycle bin...');
    await RecycleBin.create({
      entityType: 'category',
      entityId: category._id,
      entityData: category.toObject(),
      deletedBy: testUser._id,
      ownerId: testUser._id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Verify the category is in the recycle bin
    const recycleBinItem = await RecycleBin.findOne({ 
      entityId: category._id,
      ownerId: testUser._id 
    });
    console.log('Category in recycle bin?', !!recycleBinItem); // Should be true
    console.log('Entity type:', recycleBinItem?.entityType); // Should be 'category'

    console.log('\n✅ Category soft delete functionality test completed successfully!');

    // Clean up
    await Category.deleteMany({ ownerId: testUser._id });
    await RecycleBin.deleteMany({ ownerId: testUser._id });
    await User.deleteMany({ email: 'test@example.com'});

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCategorySoftDeleteFunctionality();
