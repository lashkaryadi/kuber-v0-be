import * as Inventory from '../models/inventoryModel.js';

export function getAllItems(req, res, next) {
  try {
    const items = Inventory.getAll();
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export function getItemById(req, res, next) {
  try {
    const item = Inventory.getById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export function createItem(req, res, next) {
  try {
    const created = Inventory.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      err.status = 409;
      err.message = 'Serial Number must be unique';
    }
    next(err);
  }
}

export function updateItem(req, res, next) {
  try {
    const changes = Inventory.update(req.params.id, req.body);
    if (changes === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item updated' });
  } catch (err) {
    next(err);
  }
}

export function deleteItem(req, res, next) {
  try {
    const changes = Inventory.remove(req.params.id);
    if (changes === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
}
