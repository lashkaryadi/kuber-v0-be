import jwt from "jsonwebtoken";

export const generateAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      ownerId: user.ownerId,
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
