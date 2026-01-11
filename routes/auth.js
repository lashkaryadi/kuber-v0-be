import express from "express";
import { register, login, getMe, refreshToken, logout, verifyEmailOtp, resendEmailOtp } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmailOtp);
router.post("/resend-otp", resendEmailOtp);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;
