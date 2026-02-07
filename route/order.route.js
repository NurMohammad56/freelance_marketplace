import express from "express";
import {
  createOrderFromGig,
  createOrderFromCustomOffer,
  getOrderById,
  getMyOrders,
  requestReschedule,
  respondToReschedule,
  cancelOrder,
  completeOrder,
  acceptCustomOffer,
  rejectCustomOffer,
} from "../controllers/order.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create orders
router.post("/from-gig/:gigId", createOrderFromGig);
router.post("/from-offer/:offerId", createOrderFromCustomOffer);

router.post("/from-offer/:offerId/accept", acceptCustomOffer);

router.post("/from-offer/:offerId/reject", rejectCustomOffer);

// Get orders
router.get("/my-orders", getMyOrders);
router.get("/:orderId", getOrderById);

// Order actions
router.post("/:orderId/reschedule", requestReschedule);
router.patch("/:orderId/reschedule/:requestId", respondToReschedule);
router.patch("/:orderId/cancel", cancelOrder);
router.patch("/:orderId/complete", completeOrder);

export default router;
