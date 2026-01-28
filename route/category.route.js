import express from "express";
import {
  getAllCategories,
  getCategoryById,
} from "../controllers/misc.controller.js";

const router = express.Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:categoryId", getCategoryById);

export default router;
