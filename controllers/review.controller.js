import httpStatus from "http-status";
import { Review } from "../models/review.model.js";
import { Order } from "../models/order.model.js";
import { Gig } from "../models/gig.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { createNotification } from "../utils/notification.js";

// @desc    Create review
// @route   POST /api/orders/:orderId/review
// @access  Private (Client)
export const createReview = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId } = req.params;
  const { rating, comment, communication, serviceQuality, delivery } = req.body;

  if (req.user.role !== "client") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Only clients can write reviews"),
    );
  }

  const order = await Order.findById(orderId);

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  if (order.client.toString() !== userId.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only review your own orders"),
    );
  }

  if (order.status !== "completed") {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Can only review completed orders"),
    );
  }

  // Check if already reviewed
  const existingReview = await Review.findOne({ order: orderId });
  if (existingReview) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "You have already reviewed this order",
      ),
    );
  }

  const review = await Review.create({
    order: orderId,
    client: userId,
    creative: order.creative,
    gig: order.gig,
    rating,
    comment,
    communication: communication || rating,
    serviceQuality: serviceQuality || rating,
    delivery: delivery || rating,
  });

  // Update gig rating
  if (order.gig) {
    const gig = await Gig.findById(order.gig);
    if (gig) {
      const totalRating = gig.rating * gig.reviewCount + rating;
      gig.reviewCount += 1;
      gig.rating = totalRating / gig.reviewCount;
      await gig.save();
    }
  }

  // Send notification to creative
  await createNotification({
    recipient: order.creative,
    sender: userId,
    type: "review_received",
    title: "New Review Received",
    message: `You received a ${rating}-star review`,
    order: orderId,
  });

  const populatedReview = await Review.findById(review._id)
    .populate("client", "name profileImage")
    .populate("creative", "name profileImage");

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review submitted successfully",
    data: populatedReview,
  });
});

// @desc    Get creative's reviews
// @route   GET /api/users/:creativeId/reviews
// @access  Public
export const getCreativeReviews = catchAsync(async (req, res, next) => {
  const { creativeId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const query = {
    creative: creativeId,
    isDeleted: false,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const reviews = await Review.find(query)
    .populate("client", "name profileImage")
    .populate("order", "title orderId")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Review.countDocuments(query);

  // Calculate average ratings
  const stats = await Review.aggregate([
    { $match: { creative: creativeId, isDeleted: false } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        avgCommunication: { $avg: "$communication" },
        avgServiceQuality: { $avg: "$serviceQuality" },
        avgDelivery: { $avg: "$delivery" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data: {
      reviews,
      stats: stats[0] || null,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalReviews: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Delete review (Creative can delete their received reviews)
// @route   DELETE /api/reviews/:reviewId
// @access  Private (Creative)
export const deleteReview = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId);

  if (!review || review.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Review not found"));
  }

  // Creative can delete reviews they received (as per requirements)
  if (review.creative.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only delete reviews you received",
      ),
    );
  }

  review.isDeleted = true;
  review.deletedBy = userId;
  review.deletedAt = new Date();
  await review.save();

  // Update gig rating
  if (review.gig) {
    const gig = await Gig.findById(review.gig);
    if (gig && gig.reviewCount > 0) {
      const totalRating = gig.rating * gig.reviewCount - review.rating;
      gig.reviewCount -= 1;
      gig.rating = gig.reviewCount > 0 ? totalRating / gig.reviewCount : 0;
      await gig.save();
    }
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review deleted successfully",
    data: null,
  });
});

// @desc    Get gig reviews
// @route   GET /api/gigs/:gigId/reviews
// @access  Public
export const getGigReviews = catchAsync(async (req, res, next) => {
  const { gigId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const query = {
    gig: gigId,
    isDeleted: false,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const reviews = await Review.find(query)
    .populate("client", "name profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Review.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gig reviews retrieved successfully",
    data: {
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalReviews: total,
        limit: Number(limit),
      },
    },
  });
});
