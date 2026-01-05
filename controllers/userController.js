import * as User from '../models/userModel.js';

export function getAllUsers(req, res, next) {
  try {
    const users = User.getAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export function getUserById(req, res, next) {
  try {
    const user = User.getById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export function createUser(req, res, next) {
  try {
    const created = User.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      err.status = 409;
      err.message = 'Username must be unique';
    }
    next(err);
  }
}
