import httpStatus from "http-status";
import { Like } from "../models/like.model.js";
import { BlockList } from "../models/blockList.model.js";
import { Report } from "../models/report.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

const VALID_REACTION_ROLES = ["client", "creative"];

const parseReactionRole = (roleValue) => {
  if (!roleValue) return null;

  const normalizedRole = roleValue.toString().trim().toLowerCase();
  if (!VALID_REACTION_ROLES.includes(normalizedRole)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid role filter. Allowed: client, creative",
    );
  }

  return normalizedRole;
};

const validateReactionTarget = async (targetUserId, targetType, next) => {
  if (!targetUserId) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "targetUserId is required"),
    );
  }

  if (targetType !== "user") {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid target type"));
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser || targetUser.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Target user not found"));
  }

  return targetUser;
};

const createReaction = async (req, res, next, likeType) => {
  const userId = req.user._id;
  const { targetUserId, targetType = "user" } = req.body;

  const targetUser = await validateReactionTarget(
    targetUserId,
    targetType,
    next,
  );
  if (!targetUser) return;

  const existingReaction = await Like.findOne({
    liker: userId,
    liked: targetUserId,
    targetType,
    likeType,
    isDeleted: false,
  });

  if (existingReaction) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Already ${likeType}d`,
      data: existingReaction,
    });
  }

  const reaction = await Like.create({
    liker: userId,
    liked: targetUserId,
    likeType,
    targetType,
  });

  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${likeType === "like" ? "Like" : "Dislike"} added successfully`,
    data: reaction,
  });
};

const removeReaction = async (req, res, next, likeType) => {
  const userId = req.user._id;
  const { targetUserId } = req.params;
  const { targetType = "user" } = req.query;

  const reaction = await Like.findOne({
    liker: userId,
    liked: targetUserId,
    targetType,
    likeType,
    isDeleted: false,
  });

  if (!reaction) {
    return next(
      new AppError(
        httpStatus.NOT_FOUND,
        `${likeType === "like" ? "Like" : "Dislike"} not found`,
      ),
    );
  }

  await reaction.deleteOne();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${likeType === "like" ? "Like" : "Dislike"} removed successfully`,
    data: null,
  });
};

// @desc    Add like
// @route   POST /api/social/like
// @access  Private
export const addLike = catchAsync(async (req, res, next) => {
  return createReaction(req, res, next, "like");
});

// @desc    Remove like
// @route   DELETE /api/social/like/:targetUserId
// @access  Private
export const removeLike = catchAsync(async (req, res, next) => {
  return removeReaction(req, res, next, "like");
});

// @desc    Add dislike
// @route   POST /api/social/dislike
// @access  Private
export const addDislike = catchAsync(async (req, res, next) => {
  return createReaction(req, res, next, "dislike");
});

// @desc    Remove dislike
// @route   DELETE /api/social/dislike/:targetUserId
// @access  Private
export const removeDislike = catchAsync(async (req, res, next) => {
  return removeReaction(req, res, next, "dislike");
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

// @desc    Get user's dislikes
// @route   GET /api/social/my-dislikes
// @access  Private
export const getMyDislikes = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const query = {
    liker: userId,
    likeType: "dislike",
    isDeleted: false,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const dislikes = await Like.find(query)
    .populate("liked", "name email role profileImage bio isVerified")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Like.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dislikes retrieved successfully",
    data: {
      dislikes,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get my likes and dislikes for creative users
// @route   GET /api/social/my-creative-reactions
// @access  Private
export const getMyCreativeReactions = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const requestedTargetRole = parseReactionRole(req.query.targetRole);
  const targetRole =
    requestedTargetRole || (req.user.role === "client" ? "creative" : null);

  const populateMatch = {
    isDeleted: false,
    ...(targetRole ? { role: targetRole } : {}),
  };

  const reactions = await Like.find({
    liker: userId,
    targetType: "user",
    isDeleted: false,
  })
    .populate({
      path: "liked",
      select: "name email role profileImage bio isVerified specialRole",
      match: populateMatch,
    })
    .sort({ createdAt: -1 });

  const filteredReactions = reactions.filter((reaction) =>
    Boolean(reaction.liked),
  );

  const likedUsers = filteredReactions
    .filter((reaction) => reaction.likeType === "like")
    .map((reaction) => ({
      reactionId: reaction._id,
      reactedAt: reaction.createdAt,
      user: reaction.liked,
    }));

  const dislikedUsers = filteredReactions
    .filter((reaction) => reaction.likeType === "dislike")
    .map((reaction) => ({
      reactionId: reaction._id,
      reactedAt: reaction.createdAt,
      user: reaction.liked,
    }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reaction list retrieved successfully",
    data: {
      filters: {
        targetRole: targetRole || "all",
      },
      counts: {
        likes: likedUsers.length,
        dislikes: dislikedUsers.length,
      },
      likes: likedUsers,
      dislikes: dislikedUsers,
    },
  });
});

// @desc    Get likes and dislikes received on my creative profile
// @route   GET /api/social/my-received-reactions
// @access  Private (Creative)
export const getMyReceivedReactions = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const likerRole = parseReactionRole(req.query.likerRole);

  if (req.user.role !== "creative") {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only creatives can view received reactions",
      ),
    );
  }

  const reactions = await Like.find({
    liked: userId,
    targetType: "user",
    isDeleted: false,
  })
    .populate({
      path: "liker",
      select: "name email role profileImage",
      match: {
        isDeleted: false,
        ...(likerRole ? { role: likerRole } : {}),
      },
    })
    .sort({ createdAt: -1 });

  const filteredReactions = reactions.filter((reaction) =>
    Boolean(reaction.liker),
  );

  const likes = filteredReactions
    .filter((reaction) => reaction.likeType === "like")
    .map((reaction) => ({
      reactionId: reaction._id,
      reactedAt: reaction.createdAt,
      user: reaction.liker,
    }));

  const dislikes = filteredReactions
    .filter((reaction) => reaction.likeType === "dislike")
    .map((reaction) => ({
      reactionId: reaction._id,
      reactedAt: reaction.createdAt,
      user: reaction.liker,
    }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Received reactions retrieved successfully",
    data: {
      filters: {
        likerRole: likerRole || "all",
      },
      counts: {
        likes: likes.length,
        dislikes: dislikes.length,
      },
      likes,
      dislikes,
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

// @desc    Get users who disliked a user
// @route   GET /api/social/users/:userId/dislikers
// @access  Private
export const getUserDislikers = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const query = {
    liked: userId,
    likeType: "dislike",
    isDeleted: false,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const dislikes = await Like.find(query)
    .populate("liker", "name email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Like.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dislikers retrieved successfully",
    data: {
      dislikers: dislikes.map((dislike) => dislike.liker),
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
    orderId,
    reviewId,
    messageId,
  } = req.body;

  if (!["user", "order", "review", "message"].includes(reportType)) {
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
