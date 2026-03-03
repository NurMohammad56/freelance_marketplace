import express from "express";
import {
  getProfile,
  getUserById,
  getClientById,
  getCreativeById,
  updateProfile,
  addWork,
  deleteWork,
  addProject,
  deleteProject,
  updateSettings,
  deleteAccount,
  getNearbyUsers,
  searchUsers,
} from "../controllers/user.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public routes
router.get("/search", protect, searchUsers);
router.get("/nearby", protect, getNearbyUsers);
router.get("/client/:userId", getClientById);
router.get("/creative/:userId", getCreativeById);
router.get("/:userId", getUserById);

// Protected routes
router.use(protect); // All routes below require authentication

router.get("/profile/me", getProfile);
router.put("/profile", upload.single("avatar"), updateProfile);

// Works (Creative only)
router.post(
  "/works",
  restrictTo("client"),
  upload.array("workImages", 5),
  addWork,
);
router.delete("/works/:workId", restrictTo("client"), deleteWork);

// Projects (Client only)
router.post(
  "/projects",
  restrictTo("client"),
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 3 },
  ]),
  addProject,
);
router.delete("/projects/:projectId", restrictTo("client"), deleteProject);

// Settings & Account
router.put("/settings", updateSettings);
router.delete("/account", deleteAccount);

export default router;
