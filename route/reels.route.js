import express from "express";
import {
  createReels,
  getReels,
  getReelById,
  getMyReels,
  updateReels,
  deleteReels,
} from "../controllers/reels.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getReels);
router.get("/:reelId", getReelById);

// Protected routes (Creative)
router.use(protect);
router.use(restrictTo("creative"));

router.get("/my-reels", getMyReels);
router.post("/", upload.array("reels", 10), createReels);
router.patch("/:reelId", upload.array("reels", 10), updateReels);
router.delete("/:reelId", deleteReels);

export default router;
