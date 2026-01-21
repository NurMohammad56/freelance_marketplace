import express from "express";
import {
  createGig,
  getMyGigs,
  getPublicGigs,
  updateGig,
  deleteGig,
} from "../controller/gig.controller.js";

import { protect } from "./../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";
const router = express.Router();

router.post(
  "/",
  protect,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "reels", maxCount: 3 },
  ]),
  createGig
);

router.get("/me", protect, getMyGigs);
router.get("/", getPublicGigs);

router.put("/:gigId", protect, updateGig);
router.delete("/:gigId", protect, deleteGig);

export default router;
