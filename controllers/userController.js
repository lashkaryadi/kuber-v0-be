// import * as User from '../models/User.js';

// export function getAllUsers(req, res, next) {
//   try {
//     const users = User.getAll();
//     res.json(users);
//   } catch (err) {
//     next(err);
//   }
// }

// export function getUserById(req, res, next) {
//   try {
//     const user = User.getById(req.params.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     res.json(user);
//   } catch (err) {
//     next(err);
//   }
// }

// export function createUser(req, res, next) {
//   try {
//     const created = User.create(req.body);
//     res.status(201).json(created);
//   } catch (err) {
//     if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
//       err.status = 409;
//       err.message = 'Username must be unique';
//     }
//     next(err);
//   }
// }
import User from "../models/User.js";

// export const getUsers = async (req, res) => {
//   const users = await User.find().select("-password");

//   res.json(
//     users.map((u) => ({
//       id: u._id.toString(),
//       username: u.username,
//       email: u.email,
//       role: u.role,
//       createdAt: u.createdAt,
//     }))
//   );
// };

export const getUsers = async (req, res) => {
  const users = await User.find();
  res.json(users); // toJSON will convert _id → id
};



// export const createUser = async (req, res) => {
//   const { username, email, password, role } = req.body;

//   const exists = await User.findOne({ email });
//   if (exists) {
//     return res.status(409).json({ message: "User already exists" });
//   }

//   const user = await User.create({
//     username,
//     email,
//     password,
//     role,
//   });

//   res.status(201).json({
//     id: user._id,
//     username: user.username,
//     email: user.email,
//     role: user.role,
//   });
// };
export const createUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ message: "User already exists" });
  }

  const user = await User.create({ username, email, password, role });
  res.status(201).json(user);
};


// export const updateUser = async (req, res) => {
//   const { username, email, role, password } = req.body;

//   const user = await User.findById(req.params.id);
//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   // Update only allowed fields
//   if (username !== undefined) user.username = username;
//   if (email !== undefined) user.email = email;
//   if (role !== undefined) user.role = role;

//   // Update password ONLY if provided
//   if (password && password.trim() !== "") {
//     user.password = password;
//   }

//   await user.save();

//   res.json({
//     id: user._id.toString(),
//     username: user.username,
//     email: user.email,
//     role: user.role,
//     createdAt: user.createdAt,
//   });
// };

export const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.body.password) {
    user.password = req.body.password;
  }

  user.username = req.body.username ?? user.username;
  user.email = req.body.email ?? user.email;
  user.role = req.body.role ?? user.role;

  await user.save();
  res.json(user);
};


export const deleteUser = async (req, res) => {
  const userToDelete = await User.findById(req.params.id);

  if (!userToDelete) {
    return res.status(404).json({ message: "User not found" });
  }

  // ❌ Admin cannot delete himself
  if (req.user._id.toString() === userToDelete._id.toString()) {
    return res.status(400).json({ message: "Admin cannot delete himself" });
  }

  // ❌ OPTIONAL: prevent deleting another admin
  if (userToDelete.role === "admin") {
    return res.status(403).json({ message: "Cannot delete another admin" });
  }

  await userToDelete.deleteOne();

  res.json({ success: true });
};

