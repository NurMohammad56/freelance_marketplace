import httpStatus from "http-status";
import { Like } from "../models/like.model.js";
import { BlockList } from "../models/blockList.model.js";
import { Report } from "../models/report.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

// ============ LIKE/DISLIKE FUNCTIONALITY ============

// @desc    Toggle like/dislike
// @route   POST /api/social/like
// @access  Private
export const toggleLike = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    targetUserId,
    targetType = "user",
    gigId,
    likeType = "like",
  } = req.body;

  if (!["like", "dislike"].includes(likeType)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid like type"));
  }

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return next(new AppError(httpStatus.NOT_FOUND, "Target user not found"));
  }

  // Find existing like
  const existingLike = await Like.findOne({
    liker: userId,
    liked: targetUserId,
    targetType,
    ...(gigId && { gig: gigId }),
  });

  if (existingLike) {
    if (existingLike.likeType === likeType) {
      // Remove like if same type
      await existingLike.deleteOne();
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `${likeType} removed`,
        data: { action: "removed" },
      });
    } else {
      // Toggle between like and dislike
      existingLike.likeType = likeType;
      await existingLike.save();
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Changed to ${likeType}`,
        data: { action: "toggled", likeType },
      });
    }
  }

  // Create new like
  await Like.create({
    liker: userId,
    liked: targetUserId,
    likeType,
    targetType,
    ...(gigId && { gig: gigId }),
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${likeType}d successfully`,
    data: { action: "created", likeType },
  });
});

// @desc    Get user's likes
// @route   GET /api/social/my-likes
// @access  Private
export const getMyLikes = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { likeType, page = 1, limit = 20 } = req.query;

  const query = {
    liker: userId,
    isDeleted: false,
  };

  if (likeType) query.likeType = likeType;

  const skip = (Number(page) - 1) * Number(limit);

  const likes = await Like.find(query)
    .populate("liked", "name email profileImage bio")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Like.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Likes retrieved successfully",
    data: {
      likes,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get users who liked a user
// @route   GET /api/social/users/:userId/likers
// @access  Private
export const getUserLikers = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const query = {
    liked: userId,
    likeType: "like",
    isDeleted: false,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const likes = await Like.find(query)
    .populate("liker", "name email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Like.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Likers retrieved successfully",
    data: {
      likers: likes.map((like) => like.liker),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// ============ BLOCK FUNCTIONALITY ============

// @desc    Block user
// @route   POST /api/social/block
// @access  Private
export const blockUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { targetUserId, reason } = req.body;

  if (userId.toString() === targetUserId.toString()) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Cannot block yourself"));
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  // Check if already blocked
  const existingBlock = await BlockList.findOne({
    blocker: userId,
    blocked: targetUserId,
    isDeleted: false,
  });

  if (existingBlock) {
    return next(new AppError(httpStatus.BAD_REQUEST, "User already blocked"));
  }

  await BlockList.create({
    blocker: userId,
    blocked: targetUserId,
    reason,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User blocked successfully",
    data: null,
  });
});

// @desc    Unblock user
// @route   DELETE /api/social/block/:targetUserId
// @access  Private
export const unblockUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { targetUserId } = req.params;

  const block = await BlockList.findOne({
    blocker: userId,
    blocked: targetUserId,
    isDeleted: false,
  });

  if (!block) {
    return next(new AppError(httpStatus.NOT_FOUND, "Block not found"));
  }

  block.isDeleted = true;
  await block.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User unblocked successfully",
    data: null,
  });
});

// @desc    Get blocked users
// @route   GET /api/social/blocked-users
// @access  Private
export const getBlockedUsers = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const query = {
    blocker: userId,
    isDeleted: false,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const blocks = await BlockList.find(query)
    .populate("blocked", "name email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await BlockList.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blocked users retrieved successfully",
    data: {
      blockedUsers: blocks.map((block) => block.blocked),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// ============ REPORT FUNCTIONALITY ============

// @desc    Report user/content
// @route   POST /api/social/report
// @access  Private
export const reportUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    reportedUserId,
    reportType,
    reason,
    description,
    gigId,
    orderId,
    reviewId,
    messageId,
  } = req.body;

  if (!["user", "gig", "order", "review", "message"].includes(reportType)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid report type"));
  }

  const validReasons = [
    "spam",
    "harassment",
    "inappropriate_content",
    "fraud",
    "fake_profile",
    "poor_quality",
    "unprofessional",
    "scam",
    "fake_reviews",
    "copyright_violation",
    "other",
  ];

  if (!validReasons.includes(reason)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid reason"));
  }

  // Upload evidence if provided
  const evidence = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const upload = await uploadOnCloudinary(file.buffer);
      evidence.push({
        public_id: upload.public_id,
        url: upload.secure_url,
        fileType: file.mimetype.startsWith("image") ? "image" : "document",
      });
    }
  }

  const report = await Report.create({
    reporter: userId,
    reportedUser: reportedUserId,
    reportType,
    reason,
    description,
    evidence,
    ...(gigId && { gig: gigId }),
    ...(orderId && { order: orderId }),
    ...(reviewId && { review: reviewId }),
    ...(messageId && { message: messageId }),
    status: "pending",
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Report submitted successfully",
    data: report,
  });
});

// @desc    Get user's reports
// @route   GET /api/social/my-reports
// @access  Private
export const getMyReports = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, status } = req.query;

  const query = {
    reporter: userId,
    isDeleted: false,
  };

  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const reports = await Report.find(query)
    .populate("reportedUser", "name email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Report.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reports retrieved successfully",
    data: {
      reports,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});
