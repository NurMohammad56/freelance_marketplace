import express from "express";
import {
  getDashboardOverview,
  getAllUsers,
  toggleUserStatus,
  getRevenueStats,
  getPaymentHistory,
  approvePayment,
  getVerificationRequests,
  reviewVerification,
  getAllReports,
  reviewReport,
  createSubscription,
  getAllSubscriptions,
  updateSubscription,
  deleteSubscription,
} from "../controllers/admin.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(restrictTo("admin"));

// Dashboard
router.get("/dashboard", getDashboardOverview);

// User Management
router.get("/users", getAllUsers);
router.patch("/users/:userId/toggle-status", toggleUserStatus);

// Revenue & Transactions
router.get("/revenue", getRevenueStats);
router.get("/payments", getPaymentHistory);
router.patch("/payments/:transactionId/approve", approvePayment);

// Verification Management
router.get("/verifications", getVerificationRequests);
router.patch("/verifications/:verificationId", reviewVerification);

// Reports Management
router.get("/reports", getAllReports);
router.patch("/reports/:reportId", reviewReport);

// Subscription Management
router.post("/subscriptions", createSubscription);
router.get("/subscriptions", getAllSubscriptions);
router.patch("/subscriptions/:subscriptionId", updateSubscription);
router.delete("/subscriptions/:subscriptionId", deleteSubscription);

export default router;
