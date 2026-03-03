import express from "express";
import {
  createJobPost,
  payPremium,
  getAllJobPosts,
  getJobPostById,
  getMyJobPosts,
  updateJobPost,
  applyToJobPost,
  updateApplicantStatus,
  closeJobPost,
  deleteJobPost,
} from "../controllers/jobPost.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllJobPosts);
router.get("/:jobPostId", getJobPostById);

// Protected routes
router.use(protect);

// Creative routes
router.post("/:jobPostId/apply", restrictTo("creative"), applyToJobPost);

// Client routes
router.post(
  "/",
  restrictTo("client"),
  upload.array("attachments", 5),
  createJobPost,
);
router.get("/my/posts", restrictTo("client"), getMyJobPosts);
router.post("/:jobPostId/pay-premium", restrictTo("client"), payPremium);
router.put(
  "/:jobPostId",
  restrictTo("client"),
  upload.array("attachments", 5),
  updateJobPost,
);
router.patch(
  "/:jobPostId/applicants/:applicantId",
  restrictTo("client"),
  updateApplicantStatus,
);
router.patch("/:jobPostId/close", restrictTo("client"), closeJobPost);
router.delete("/:jobPostId", restrictTo("client"), deleteJobPost);

export default router;
