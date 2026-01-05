import db from '../database.js';

export function getAll() {
  return db.prepare('SELECT id, username, role, createdAt FROM users').all();
}

export function getById(id) {
  return db.prepare('SELECT id, username, role, createdAt FROM users WHERE id = ?').get(id);
}

export function create(user) {
  const stmt = db.prepare(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`);
  const info = stmt.run(user.username, user.password, user.role);
  return { id: info.lastInsertRowid, ...user };
}
