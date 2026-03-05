import httpStatus from "http-status";
import { Reel } from "../models/reels.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

const parseTags = (tags) => {
  if (tags === undefined || tags === null) return undefined;
  if (Array.isArray(tags)) return tags.map((tag) => tag.toString().trim()).filter(Boolean);

  if (typeof tags === "string") {
    const trimmedTags = tags.trim();
    if (!trimmedTags) return [];

    if (trimmedTags.startsWith("[") || trimmedTags.startsWith("{")) {
      try {
        const parsedTags = JSON.parse(trimmedTags);
        return Array.isArray(parsedTags)
          ? parsedTags.map((tag) => tag.toString().trim()).filter(Boolean)
          : [];
      } catch (error) {
        return trimmedTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    return trimmedTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const getReelFiles = (req) => {
  if (req.files?.reels && Array.isArray(req.files.reels)) return req.files.reels;
  if (Array.isArray(req.files)) return req.files;
  return [];
};

// @desc    Create reels
// @route   POST /api/reels
// @access  Private (Creative)
export const createReels = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { title } = req.body;

  if (req.user.role !== "creative") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Only creatives can create reels"),
    );
  }

  const reelFiles = getReelFiles(req);
  if (!reelFiles.length) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "At least one reel video is required"),
    );
  }

  const uploadResults = await Promise.all(
    reelFiles.map((file) =>
      uploadOnCloudinary(file.buffer, {
        folder: "fiverr-platform/reels",
        resource_type: "video",
      }),
    ),
  );

  const reelAssets = uploadResults.map((video) => ({
    public_id: video.public_id,
    url: video.secure_url,
  }));

  const reels = await Reel.create({
    creative: userId,
    title: title?.toString().trim() || "",
    reels: reelAssets,
    tags: parseTags(req.body.tags) || [],
  });

  const populatedReel = await Reel.findById(reels._id).populate(
    "creative",
    "name profileImage isVerified specialRole",
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Reels created successfully",
    data: populatedReel,
  });
});

// @desc    Get all reels
// @route   GET /api/reels
// @access  Public
export const getReels = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, tag, creativeId, search } = req.query;

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  const skip = (parsedPage - 1) * parsedLimit;

  const filter = { isDeleted: false };

  if (creativeId) filter.creative = creativeId;
  if (tag) filter.tags = { $in: [tag] };
  if (search) filter.title = { $regex: search, $options: "i" };

  const reels = await Reel.find(filter)
    .populate("creative", "name profileImage isVerified specialRole")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit);

  const total = await Reel.countDocuments(filter);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reels retrieved successfully",
    data: {
      reels,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        total,
        limit: parsedLimit,
      },
    },
  });
});

// @desc    Get reel by ID
// @route   GET /api/reels/:reelId
// @access  Public
export const getReelById = catchAsync(async (req, res, next) => {
  const { reelId } = req.params;

  const reel = await Reel.findById(reelId).populate(
    "creative",
    "name profileImage isVerified specialRole",
  );

  if (!reel || reel.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Reel not found"));
  }

  reel.views += 1;
  await reel.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reel retrieved successfully",
    data: reel,
  });
});

// @desc    Get creative's own reels
// @route   GET /api/reels/my-reels
// @access  Private (Creative)
export const getMyReels = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  const skip = (parsedPage - 1) * parsedLimit;

  const reels = await Reel.find({
    creative: userId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit);

  const total = await Reel.countDocuments({
    creative: userId,
    isDeleted: false,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your reels retrieved successfully",
    data: {
      reels,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        total,
        limit: parsedLimit,
      },
    },
  });
});

// @desc    Update reels
// @route   PATCH /api/reels/:reelId
// @access  Private (Creative)
export const updateReels = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { reelId } = req.params;
  const { title } = req.body;

  const reel = await Reel.findById(reelId);

  if (!reel || reel.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Reel not found"));
  }

  if (reel.creative.toString() !== userId.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only update your own reels"),
    );
  }

  if (title !== undefined) reel.title = title?.toString().trim() || "";

  const parsedTags = parseTags(req.body.tags);
  if (parsedTags !== undefined) reel.tags = parsedTags;

  const reelFiles = getReelFiles(req);
  if (reelFiles.length) {
    for (const reelItem of reel.reels) {
      if (reelItem.public_id) {
        const resourceType = reelItem.url?.includes("/video/") ? "video" : "image";
        await deleteFromCloudinary(reelItem.public_id, resourceType);
      }
    }

    const uploadResults = await Promise.all(
      reelFiles.map((file) =>
        uploadOnCloudinary(file.buffer, {
          folder: "fiverr-platform/reels",
          resource_type: "video",
        }),
      ),
    );

    reel.reels = uploadResults.map((video) => ({
      public_id: video.public_id,
      url: video.secure_url,
    }));
  }

  await reel.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reel updated successfully",
    data: reel,
  });
});

// @desc    Delete reels
// @route   DELETE /api/reels/:reelId
// @access  Private (Creative)
export const deleteReels = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { reelId } = req.params;

  const reel = await Reel.findById(reelId);

  if (!reel || reel.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Reel not found"));
  }

  if (reel.creative.toString() !== userId.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only delete your own reels"),
    );
  }

  reel.isDeleted = true;
  await reel.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reel deleted successfully",
    data: null,
  });
});
