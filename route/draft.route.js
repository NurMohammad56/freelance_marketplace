import express from "express";
import {
  submitDraft,
  getOrderDrafts,
  getDraftById,
  approveDraft,
  requestRevision,
  rejectDraft,
  deleteDraft,
} from "../controllers/draft.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Draft submission (Creative)
router.post(
  "/orders/:orderId/drafts",
  restrictTo("creative"),
  upload.array("files", 10),
  submitDraft,
);

// Get drafts
router.get("/orders/:orderId/drafts", getOrderDrafts);
router.get("/:draftId", getDraftById);

// Client actions
router.patch("/:draftId/approve", restrictTo("client"), approveDraft);
router.patch(
  "/:draftId/request-revision",
  restrictTo("client"),
  requestRevision,
);
router.patch("/:draftId/reject", restrictTo("client"), rejectDraft);

// Creative actions
router.delete("/:draftId", restrictTo("creative"), deleteDraft);

export default router;
