import httpStatus from "http-status";
import { Portfolio } from "../models/portfolio.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

// @desc    Create portfolio item
// @route   POST /api/portfolios
// @access  Private (Creative)
export const createPortfolio = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    title,
    description,
    category,
    tags,
    projectUrl,
    completionDate,
    client,
    isFeatured,
  } = req.body;

  if (req.user.role !== "creative") {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only creatives can create portfolio items",
      ),
    );
  }

  if (!req.files || (!req.files.images && !req.files.videos)) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "At least one image or video is required",
      ),
    );
  }

  // Upload images
  const images = [];
  if (req.files.images) {
    for (const file of req.files.images) {
      const upload = await uploadOnCloudinary(file.buffer);
      images.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
  }

  // Upload videos
  const videos = [];
  if (req.files.videos) {
    for (const file of req.files.videos) {
      const upload = await uploadOnCloudinary(file.buffer);
      videos.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
  }

  const portfolio = await Portfolio.create({
    creative: userId,
    title,
    description,
    category,
    tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
    projectUrl,
    completionDate,
    client,
    isFeatured: isFeatured === "true",
    images,
    videos,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Portfolio item created successfully",
    data: portfolio,
  });
});

// @desc    Get creative's portfolio
// @route   GET /api/portfolios/creative/:creativeId
// @access  Public
export const getCreativePortfolio = catchAsync(async (req, res, next) => {
  const { creativeId } = req.params;
  const { page = 1, limit = 20, category, isFeatured } = req.query;

  const query = {
    creative: creativeId,
    isDeleted: false,
  };

  if (category) query.category = category;
  if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

  const skip = (Number(page) - 1) * Number(limit);

  const portfolios = await Portfolio.find(query)
    .skip(skip)
    .limit(Number(limit))
    .sort({ isFeatured: -1, createdAt: -1 });

  const total = await Portfolio.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Portfolio retrieved successfully",
    data: {
      portfolios,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get portfolio by ID
// @route   GET /api/portfolios/:portfolioId
// @access  Public
export const getPortfolioById = catchAsync(async (req, res, next) => {
  const { portfolioId } = req.params;

  const portfolio = await Portfolio.findById(portfolioId).populate(
    "creative",
    "name email profileImage isVerified bio",
  );

  if (!portfolio || portfolio.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Portfolio item not found"));
  }

  // Increment views
  portfolio.views += 1;
  await portfolio.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Portfolio item retrieved successfully",
    data: portfolio,
  });
});

// @desc    Update portfolio
// @route   PUT /api/portfolios/:portfolioId
// @access  Private (Creative)
export const updatePortfolio = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { portfolioId } = req.params;
  const {
    title,
    description,
    category,
    tags,
    projectUrl,
    completionDate,
    client,
    isFeatured,
  } = req.body;

  const portfolio = await Portfolio.findById(portfolioId);

  if (!portfolio || portfolio.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Portfolio item not found"));
  }

  if (portfolio.creative.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only update your own portfolio items",
      ),
    );
  }

  // Update fields
  if (title) portfolio.title = title;
  if (description) portfolio.description = description;
  if (category) portfolio.category = category;
  if (tags) portfolio.tags = Array.isArray(tags) ? tags : [tags];
  if (projectUrl) portfolio.projectUrl = projectUrl;
  if (completionDate) portfolio.completionDate = completionDate;
  if (client) portfolio.client = client;
  if (isFeatured !== undefined) portfolio.isFeatured = isFeatured === "true";

  await portfolio.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Portfolio item updated successfully",
    data: portfolio,
  });
});

// @desc    Delete portfolio
// @route   DELETE /api/portfolios/:portfolioId
// @access  Private (Creative)
export const deletePortfolio = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { portfolioId } = req.params;

  const portfolio = await Portfolio.findById(portfolioId);

  if (!portfolio || portfolio.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Portfolio item not found"));
  }

  if (portfolio.creative.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only delete your own portfolio items",
      ),
    );
  }

  // Delete media from cloudinary
  for (const image of portfolio.images) {
    await deleteFromCloudinary(image.public_id);
  }

  for (const video of portfolio.videos) {
    await deleteFromCloudinary(video.public_id);
  }

  portfolio.isDeleted = true;
  await portfolio.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Portfolio item deleted successfully",
    data: null,
  });
});
