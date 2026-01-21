import jwt from "jsonwebtoken"
import dotenv from "dotenv";
dotenv.config();;
import process from "process";

export const generateAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      ownerId: user.ownerId || user._id, // ✅ CRITICAL FIX: Admin users have ownerId = null, so use their own ID
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
  );

export const generateRefreshToken = (user) =>
  jwt.sign(
    {
      id: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
  );
