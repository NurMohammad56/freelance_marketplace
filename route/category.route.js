import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/misc.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:categoryId", getCategoryById);

// Admin routes
router.post("/", protect, restrictTo("admin"), upload.single("icon"), createCategory);
router.patch(
  "/:categoryId",
  protect,
  restrictTo("admin"),
  upload.single("icon"),
  updateCategory,
);

export default router;
