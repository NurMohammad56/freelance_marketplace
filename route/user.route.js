import express from "express";
import {
  changePassword,
  getProfile,
  updateProfile,
} from "../controller/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/", protect, getProfile);
router.put(
  "/update-profile",
  protect,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "workImages", maxCount: 4 },
    { name: "projects", maxCount: 5 },
  ]),
  updateProfile
);
router.put("/change-password", protect, changePassword);

export default router;
