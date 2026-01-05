import db from '../database.js';

export function getAll() {
  return db.prepare('SELECT * FROM inventory').all();
}

export function getById(id) {
  return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
}

export function create(item) {
  const stmt = db.prepare(`INSERT INTO inventory 
    (serialNumber, category, weight, certification, location, approvalStatus)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    item.serialNumber, item.category, item.weight,
    item.certification, item.location, item.approvalStatus
  );
  return { id: info.lastInsertRowid, ...item };
}

export function update(id, changes) {
  const stmt = db.prepare(`UPDATE inventory SET 
    serialNumber = ?, category = ?, weight = ?,
    certification = ?, location = ?, approvalStatus = ?
    WHERE id = ?`);
  const info = stmt.run(
    changes.serialNumber, changes.category, changes.weight,
    changes.certification, changes.location, changes.approvalStatus, id
  );
  return info.changes;
}

export function remove(id) {
  const stmt = db.prepare('DELETE FROM inventory WHERE id = ?');
  const info = stmt.run(id);
  return info.changes;
}
