import express from "express";
import {
  toggleLike,
  getMyLikes,
  getMyDislikes,
  getMyCreativeReactions,
  getMyReceivedReactions,
  getUserLikers,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  getMyReports,
} from "../controllers/social.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Like/Dislike routes
router.post("/like", toggleLike);
router.get("/my-likes", getMyLikes);
router.get("/my-dislikes", getMyDislikes);
router.get("/my-creative-reactions", getMyCreativeReactions);
router.get("/my-received-reactions", getMyReceivedReactions);
router.get("/users/:userId/likers", getUserLikers);

// Block routes
router.post("/block", blockUser);
router.delete("/block/:targetUserId", unblockUser);
router.get("/blocked-users", getBlockedUsers);

// Report routes
router.post("/report", upload.array("evidence", 5), reportUser);
router.get("/my-reports", getMyReports);

export default router;
