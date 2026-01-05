import * as Sold from '../models/soldModel.js';

export function getAllSold(req, res, next) {
  try {
    const sold = Sold.getAll();
    res.json(sold);
  } catch (err) {
    next(err);
  }
}

export function getSoldById(req, res, next) {
  try {
    const record = Sold.getById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
}

export function recordSale(req, res, next) {
  try {
    const created = Sold.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}
