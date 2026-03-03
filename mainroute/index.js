import express from "express";

// Import all route files
import authRoutes from "../route/auth.route.js";
import userRoutes from "../route//user.route.js";
import gigRoutes from "../route//gig.route.js";
import jobPostRoutes from "../route//jobPost.route.js";
import orderRoutes from "../route//order.route.js";
import draftRoutes from "../route//draft.route.js";
import reviewRoutes from "../route//review.route.js";
import notificationRoutes from "../route//notification.route.js";
import socialRoutes from "../route//social.route.js";
import portfolioRoutes from "../route//portfolio.route.js";
import adminRoutes from "../route//admin.route.js";
import categoryRoutes from "../route//category.route.js";
import verificationRoutes from "../route//verification.route.js";
import supportRoutes from "../route//support.route.js";
import webRoutes from "../route//website.route.js";
import chatRoutes from "../route/chat.route.js";

const router = express.Router();

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount all routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/gigs", gigRoutes);
router.use("/job-posts", jobPostRoutes);
router.use("/orders", orderRoutes);
router.use("/drafts", draftRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/social", socialRoutes);
router.use("/portfolios", portfolioRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);
router.use("/verifications", verificationRoutes);
router.use("/support", supportRoutes);
router.use("/website", webRoutes);
router.use("/chat", chatRoutes);

// 404 handler for undefined routes
router.all("/", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

export default router;
