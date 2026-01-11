import jwt from "jsonwebtoken";
import User from "../models/User.js";
import process from "process";

/**
 * 🔐 Protect routes (login required)
 */
export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return res.status(401).json({ message: "Not authorized, no token" });
}


  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const dbUser = await User.findById(decoded.id).select("-password");

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 NORMALIZE ownerId
    const resolvedOwnerId =
      dbUser.role === "admin" ? dbUser._id : dbUser.ownerId;

    req.user = {
      id: dbUser._id,
      role: dbUser.role,
      ownerId: resolvedOwnerId,
      email: dbUser.email,
      username: dbUser.username,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(401).json({ message: "Token invalid" });
  }
};

/**
 * 🔐 Admin only access
 */
export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};
