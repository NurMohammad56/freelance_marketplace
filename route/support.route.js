import express from "express";
import {
  createSupportTicket,
  getMyTickets,
  getTicketById,
  updateTicketStatus,
  rateTicket,
} from "../controllers/misc.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// User routes
router.post("/tickets", upload.array("attachments", 5), createSupportTicket);
router.get("/my-tickets", getMyTickets);
router.get("/tickets/:ticketId", getTicketById);
router.patch("/tickets/:ticketId/rate", rateTicket);

// Admin routes
router.patch(
  "/tickets/:ticketId/status",
  restrictTo("admin"),
  updateTicketStatus,
);

export default router;
