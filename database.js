import Database from 'better-sqlite3';
const db = new Database('gemstone-inventory.db');

// Inventory Table
const createInventory = `CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serialNumber TEXT UNIQUE,
  category TEXT,
  weight REAL,
  certification TEXT,
  location TEXT,
  approvalStatus TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
)`;
db.exec(createInventory);

// Users Table
const createUsers = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
)`;
db.exec(createUsers);

// Sold Items Table
const createSold = `CREATE TABLE IF NOT EXISTS sold (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventoryId INTEGER,
  serialNumber TEXT,
  soldDate TEXT,
  FOREIGN KEY (inventoryId) REFERENCES inventory (id)
)`;
db.exec(createSold);

export default db;
