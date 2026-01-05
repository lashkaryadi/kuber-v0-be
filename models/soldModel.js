import db from '../database.js';

export function getAll() {
  return db.prepare(`SELECT s.*, i.serialNumber, i.category FROM sold s LEFT JOIN inventory i ON s.inventoryId = i.id`).all();
}

export function getById(id) {
  return db.prepare(`SELECT s.*, i.serialNumber, i.category FROM sold s LEFT JOIN inventory i ON s.inventoryId = i.id WHERE s.id = ?`).get(id);
}

export function create(sold) {
  const stmt = db.prepare(`INSERT INTO sold (inventoryId, serialNumber, soldDate) VALUES (?, ?, ?)`);
  const info = stmt.run(sold.inventoryId, sold.serialNumber, sold.soldDate);
  return { id: info.lastInsertRowid, ...sold };
}
