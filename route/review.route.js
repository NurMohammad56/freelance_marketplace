import express from "express";
import {
  createReview,
  getCreativeReviews,
  deleteReview,
  getGigReviews,
} from "../controllers/review.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/users/:creativeId", getCreativeReviews);
router.get("/gigs/:gigId", getGigReviews);

// Protected routes
router.use(protect);

// Create review (Client only)
router.post("/orders/:orderId", restrictTo("client"), createReview);

// Delete review (Creative can delete their received reviews)
router.delete("/:reviewId", restrictTo("creative"), deleteReview);

export default router;
