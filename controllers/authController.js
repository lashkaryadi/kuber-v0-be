import jwt from "jsonwebtoken";
import User from '../models/User.js';
import { sendEmail } from "../utils/email.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";
import { generateOtp, hashOtp } from "../utils/otp.js";

export const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });

  // ✅ Case 1: User exists AND verified → block
  if (existingUser && existingUser.isEmailVerified) {
    return res.status(409).json({
      message: "Email already registered. Please login.",
    });
  }

  // ✅ Case 2: User exists but NOT verified → resend OTP
  if (existingUser && !existingUser.isEmailVerified) {
    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    existingUser.emailOtp = hashedOtp;
    existingUser.emailOtpExpiresAt = Date.now() + 10 * 60 * 1000;
    await existingUser.save();

    try {
      await sendEmail({
        to: email,
        subject: "Verify your email",
        html: `<h2>Your OTP: ${otp}</h2>`,
      });
    } catch (emailError) {
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
    }

    return res.status(200).json({
      message: "OTP resent. Please verify your email.",
      requiresVerification: true,
      email,
    });
  }

  // ✅ Case 3: New user
  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);

  const user = await User.create({
    username,
    email,
    password,
    role,
    isEmailVerified: false,
    emailOtp: hashedOtp,
    emailOtpExpiresAt: Date.now() + 10 * 60 * 1000,
  });

  try {
    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `<h2>Your OTP: ${otp}</h2>`,
    });
  } catch (emailError) {
    // If email sending fails, delete the user and return error
    await User.deleteOne({ _id: user._id });
    return res.status(500).json({
      success: false,
      message: "Failed to send verification email. Please try again later.",
    });
  }

  res.status(201).json({
    message: "OTP sent. Verify your email.",
    requiresVerification: true,
    email,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      message: "Email not verified",
      requiresVerification: true,
      email: user.email,
    });
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const AccessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // false in development
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json({
      accessToken: AccessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
};

export const verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const hashedOtp = hashOtp(otp);

  if (
    user.emailOtp !== hashedOtp ||
    user.emailOtpExpiresAt < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // ✅ ONLY THESE FIELDS CHANGE
  user.isEmailVerified = true;
  user.emailOtp = null;
  user.emailOtpExpiresAt = null;

  await user.save();

  res.json({
    success: true,
    message: "Email verified successfully",
  });
};

export const resendEmailOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: "Email already verified",
    });
  }

  // 🔐 Generate new OTP
  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);

  user.emailOtp = hashedOtp;
  user.emailOtpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 min

  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      html: `<h2>Your OTP: ${otp}</h2>`,
    });
  } catch (emailError) {
    return res.status(500).json({
      success: false,
      message: "Failed to send verification email. Please try again later.",
    });
  }

  res.json({
    success: true,
    message: "OTP resent successfully",
  });
};

export const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user);

    res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(403).json({ message: "Refresh token expired" });
  }
};

export const logout = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res.clearCookie("refreshToken");
  res.sendStatus(204);
};

export const getMe = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
};
