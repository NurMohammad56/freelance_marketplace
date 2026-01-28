import express from "express";
import {
  createGig,
  getAllGigs,
  getGigById,
  getMyGigs,
  getGigsByCreative,
  updateGig,
  toggleGigActive,
  deleteGig,
  getTopRatedGigs,
} from "../controllers/gig.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllGigs);
router.get("/top-rated", getTopRatedGigs);
router.get("/creative/:creativeId", getGigsByCreative);
router.get("/:gigId", getGigById);

// Protected routes (Creative only)
router.use(protect);
router.use(restrictTo("creative"));

router.post(
  "/",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "reels", maxCount: 5 },
  ]),
  createGig,
);

router.get("/my/gigs", getMyGigs);

router.put(
  "/:gigId",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "reels", maxCount: 5 },
  ]),
  updateGig,
);

router.patch("/:gigId/toggle-active", toggleGigActive);
router.delete("/:gigId", deleteGig);

export default router;
