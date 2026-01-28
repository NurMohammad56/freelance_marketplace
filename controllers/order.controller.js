import httpStatus from "http-status";
import { Order } from "../models/order.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Gig } from "../models/gig.model.js";
import { JobPost } from "../models/jobPost.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { processPayment } from "../utils/stripe.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { createNotification } from "../utils/notification.js";

// Generate unique order ID
const generateOrderId = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// @desc    Create order from gig
// @route   POST /api/orders/from-gig/:gigId
// @access  Private (Client)
export const createOrderFromGig = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { gigId } = req.params;
  const { requirements, paymentMethodId } = req.body;

  if (req.user.role !== "client") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Only clients can create orders"),
    );
  }

  const gig = await Gig.findById(gigId);
  if (!gig || gig.isDeleted || !gig.isActive) {
    return next(
      new AppError(httpStatus.NOT_FOUND, "Gig not found or unavailable"),
    );
  }

  const creative = gig.creative;

  // Calculate amounts
  const amount = gig.paymentPerHour * gig.deliveryTime;
  const platformFee = amount * 0.2; // 20%
  const creativeAmount = amount - platformFee;

  // Create order
  const order = await Order.create({
    orderId: generateOrderId(),
    client: userId,
    creative,
    gig: gigId,
    title: gig.title,
    description: gig.about,
    amount,
    platformFee,
    creativeAmount,
    deliveryTime: gig.deliveryTime,
    requirements,
    revisions: {
      allowed: gig.revisions,
      used: 0,
    },
    status: "pending",
    paymentStatus: "pending",
  });

  // Process payment
  const paymentIntent = await processPayment({
    amount: Math.round(amount * 100), // Convert to cents
    currency: "usd",
    paymentMethodId,
    customerId: req.user.stripeCustomerId,
    description: `Payment for order: ${order.orderId}`,
    metadata: { orderId: order._id.toString() },
  });

  // Create transaction
  await Transaction.create({
    transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    order: order._id,
    client: userId,
    creative,
    transactionType: "order_payment",
    amount,
    platformFee,
    platformFeePercentage: 20,
    creativeAmount,
    paymentIntentId: paymentIntent.id,
    status: "completed",
    paymentStatus: {
      client_paid: true,
      held_by_platform: true,
      released_to_creative: false,
    },
  });

  // Update order payment status
  order.paymentStatus = "paid";
  order.paymentIntentId = paymentIntent.id;
  order.paidAt = new Date();
  order.status = "in_progress";
  order.startedAt = new Date();
  order.deadline = new Date(
    Date.now() + gig.deliveryTime * 24 * 60 * 60 * 1000,
  );
  await order.save();

  // Update gig stats
  gig.totalOrders += 1;
  await gig.save();

  // Send notifications
  await createNotification({
    recipient: creative,
    sender: userId,
    type: "order_placed",
    title: "New Order Received",
    message: `You have received a new order: ${order.title}`,
    order: order._id,
  });

  const populatedOrder = await Order.findById(order._id)
    .populate("client", "name email profileImage")
    .populate("creative", "name email profileImage");

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Order created and payment processed successfully",
    data: populatedOrder,
  });
});

// @desc    Create order from custom offer
// @route   POST /api/orders/from-offer/:offerId
// @access  Private (Client)
export const createOrderFromCustomOffer = catchAsync(async (req, res, next) => {
  // Implementation similar to createOrderFromGig but with custom offer
  // Will be implemented in custom offer controller
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order from custom offer",
    data: null,
  });
});

// @desc    Get order by ID
// @route   GET /api/orders/:orderId
// @access  Private
export const getOrderById = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate("client", "name email profileImage phone")
    .populate("creative", "name email profileImage phone")
    .populate("gig")
    .populate("drafts");

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  // Check authorization
  if (
    order.client.toString() !== userId.toString() &&
    order.creative.toString() !== userId.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You don't have access to this order"),
    );
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order retrieved successfully",
    data: order,
  });
});

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = {
    isDeleted: false,
  };

  // Set query based on role
  if (req.user.role === "client") {
    query.client = userId;
  } else if (req.user.role === "creative") {
    query.creative = userId;
  }

  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const orders = await Order.find(query)
    .populate("client", "name email profileImage")
    .populate("creative", "name email profileImage")
    .populate("gig", "title images")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Orders retrieved successfully",
    data: {
      orders,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalOrders: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Request reschedule
// @route   POST /api/orders/:orderId/reschedule
// @access  Private (Client or Creative)
export const requestReschedule = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId } = req.params;
  const { newDeadline, reason } = req.body;

  const order = await Order.findById(orderId);

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  // Check authorization
  const isClient = order.client.toString() === userId.toString();
  const isCreative = order.creative.toString() === userId.toString();

  if (!isClient && !isCreative) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You don't have access to this order"),
    );
  }

  if (order.status !== "in_progress") {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Can only reschedule orders that are in progress",
      ),
    );
  }

  // Add reschedule request
  order.rescheduleRequests.push({
    requestedBy: isClient ? "client" : "creative",
    newDeadline: new Date(newDeadline),
    reason,
    status: "pending",
  });

  await order.save();

  // Send notification to the other party
  const recipient = isClient ? order.creative : order.client;
  await createNotification({
    recipient,
    sender: userId,
    type: "reschedule_request",
    title: "Reschedule Request",
    message: `A reschedule request has been made for order: ${order.orderId}`,
    order: order._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Reschedule request submitted successfully",
    data: order.rescheduleRequests[order.rescheduleRequests.length - 1],
  });
});

// @desc    Respond to reschedule request
// @route   PATCH /api/orders/:orderId/reschedule/:requestId
// @access  Private (Client or Creative)
export const respondToReschedule = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId, requestId } = req.params;
  const { action } = req.body; // accepted or rejected

  const order = await Order.findById(orderId);

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  const request = order.rescheduleRequests.id(requestId);
  if (!request) {
    return next(
      new AppError(httpStatus.NOT_FOUND, "Reschedule request not found"),
    );
  }

  // Check authorization (must be the opposite party)
  const isClient = order.client.toString() === userId.toString();
  const isCreative = order.creative.toString() === userId.toString();

  if (request.requestedBy === "client" && !isCreative) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only the creative can respond to this request",
      ),
    );
  }

  if (request.requestedBy === "creative" && !isClient) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only the client can respond to this request",
      ),
    );
  }

  if (action === "accepted") {
    request.status = "accepted";
    order.deadline = request.newDeadline;

    await createNotification({
      recipient:
        request.requestedBy === "client" ? order.client : order.creative,
      sender: userId,
      type: "reschedule_accepted",
      title: "Reschedule Accepted",
      message: `Your reschedule request has been accepted for order: ${order.orderId}`,
      order: order._id,
    });
  } else {
    request.status = "rejected";

    await createNotification({
      recipient:
        request.requestedBy === "client" ? order.client : order.creative,
      sender: userId,
      type: "reschedule_rejected",
      title: "Reschedule Rejected",
      message: `Your reschedule request has been rejected for order: ${order.orderId}`,
      order: order._id,
    });
  }

  await order.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Reschedule request ${action}`,
    data: null,
  });
});

// @desc    Cancel order
// @route   PATCH /api/orders/:orderId/cancel
// @access  Private (Client or Creative)
export const cancelOrder = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(orderId);

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  const isClient = order.client.toString() === userId.toString();
  const isCreative = order.creative.toString() === userId.toString();

  if (!isClient && !isCreative && req.user.role !== "admin") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You don't have access to this order"),
    );
  }

  if (order.status === "completed" || order.status === "cancelled") {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Cannot cancel this order"),
    );
  }

  order.status = "cancelled";
  order.cancellationReason = reason;
  order.cancelledBy = isClient ? "client" : isCreative ? "creative" : "admin";
  order.cancelledAt = new Date();
  await order.save();

  // Send notification
  const recipient = isClient ? order.creative : order.client;
  await createNotification({
    recipient,
    sender: userId,
    type: "order_cancelled",
    title: "Order Cancelled",
    message: `Order ${order.orderId} has been cancelled`,
    order: order._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order cancelled successfully",
    data: null,
  });
});

// @desc    Mark order as completed (Creative)
// @route   PATCH /api/orders/:orderId/complete
// @access  Private (Creative)
export const completeOrder = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  if (order.creative.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only the creative can mark order as completed",
      ),
    );
  }

  if (order.status !== "submitted") {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Order must be in submitted status"),
    );
  }

  order.status = "completed";
  order.completedAt = new Date();
  await order.save();

  // Send notification to client
  await createNotification({
    recipient: order.client,
    sender: userId,
    type: "order_completed",
    title: "Order Completed",
    message: `Order ${order.orderId} has been completed`,
    order: order._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order marked as completed successfully",
    data: null,
  });
});
