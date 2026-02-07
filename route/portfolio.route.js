import express from "express";
import {
  createPortfolio,
  getCreativePortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
} from "../controllers/portfolio.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public routes
router.get("/creative/:creativeId", getCreativePortfolio);
router.get("/:portfolioId", getPortfolioById);

// Protected routes (Creative only)
router.use(protect);
router.use(restrictTo("creative"));

router.post(
  "/",
  upload.fields([{ name: "images", maxCount: 10 }]),
  createPortfolio,
);

router.put(
  "/:portfolioId",
  upload.fields([{ name: "images", maxCount: 10 }]),
  updatePortfolio,
);
router.delete("/:portfolioId", deletePortfolio);

export default router;
