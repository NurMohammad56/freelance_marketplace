import express from "express";
import {
  register,
  login,
  verifyEmail,
  resendOTP,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  logout,
  changePassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/verify-email", protect, verifyEmail);
router.post("/resend-otp", protect, resendOTP);
router.post("/logout", protect, logout);
router.put("/change-password", protect, changePassword);

export default router;
