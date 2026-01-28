import express from "express";
import {
  requestVerification,
  getVerificationStatus,
} from "../controllers/misc.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// All routes require creative authentication
router.use(protect);
router.use(restrictTo("creative"));

router.post("/request", upload.array("documents", 5), requestVerification);
router.get("/my-status", getVerificationStatus);

export default router;
