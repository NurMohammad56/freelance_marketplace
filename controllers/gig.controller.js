import httpStatus from "http-status";
import { Gig } from "../models/gig.model.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

// @desc    Create gig
// @route   POST /api/gigs
// @access  Private (Creative)
export const createGig = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    title,
    about,
    paymentPerHour,
    deliveryTime,
    revisions,
    tags,
    completedProgramCreative,
    service,
  } = req.body;

  // Check if user is creative
  if (req.user.role !== "creative") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Only creatives can create gigs"),
    );
  }

  if (!req.files || !req.files.images || req.files.images.length === 0) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "At least one image is required"),
    );
  }

  // Upload images
  const images = [];
  for (const file of req.files.images) {
    const upload = await uploadOnCloudinary(file.buffer);
    images.push({
      public_id: upload.public_id,
      url: upload.secure_url,
    });
  }

  // Upload reels if provided
  const reels = [];
  if (req.files.reels) {
    for (const file of req.files.reels) {
      const upload = await uploadOnCloudinary(file.buffer);
      reels.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
  }

  const gig = await Gig.create({
    creative: userId,
    title,
    about,
    paymentPerHour,
    deliveryTime: deliveryTime || 1,
    revisions: revisions || 1,
    tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
    completedProgramCreative,
    images,
    reels,
    service,
  });

  const populatedGig = await Gig.findById(gig._id).populate(
    "creative",
    "name email profileImage isVerified",
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Gig created successfully",
    data: populatedGig,
  });
});

// @desc    Get all gigs
// @route   GET /api/gigs
// @access  Public
export const getAllGigs = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    service,
    minPrice,
    maxPrice,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query = {
    isActive: true,
    isDeleted: false,
  };

  if (service) query.service = service;

  if (minPrice || maxPrice) {
    query.paymentPerHour = {};
    if (minPrice) query.paymentPerHour.$gte = Number(minPrice);
    if (maxPrice) query.paymentPerHour.$lte = Number(maxPrice);
  }

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const gigs = await Gig.find(query)
    .populate("creative", "name email profileImage isVerified bio")
    .skip(skip)
    .limit(Number(limit))
    .sort(sort);

  const total = await Gig.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gigs retrieved successfully",
    data: {
      gigs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalGigs: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get gig by ID
// @route   GET /api/gigs/:gigId
// @access  Public
export const getGigById = catchAsync(async (req, res, next) => {
  const { gigId } = req.params;

  const gig = await Gig.findById(gigId).populate(
    "creative",
    "name email profileImage isVerified bio locationGeo",
  );

  if (!gig || gig.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Gig not found"));
  }

  // Increment views
  gig.views += 1;
  await gig.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gig retrieved successfully",
    data: gig,
  });
});

// @desc    Get creative's own gigs
// @route   GET /api/gigs/my-gigs
// @access  Private (Creative)
export const getMyGigs = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, isActive } = req.query;

  const query = {
    creative: userId,
    isDeleted: false,
  };

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const skip = (Number(page) - 1) * Number(limit);

  const gigs = await Gig.find(query)
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Gig.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your gigs retrieved successfully",
    data: {
      gigs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalGigs: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get gigs by creative ID
// @route   GET /api/gigs/creative/:creativeId
// @access  Public
export const getGigsByCreative = catchAsync(async (req, res, next) => {
  const { creativeId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const query = {
    creative: creativeId,
    isActive: true,
    isDeleted: false,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const gigs = await Gig.find(query)
    .populate("creative", "name email profileImage isVerified")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Gig.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gigs retrieved successfully",
    data: {
      gigs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalGigs: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Update gig
// @route   PUT /api/gigs/:gigId
// @access  Private (Creative)
export const updateGig = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { gigId } = req.params;
  const {
    title,
    about,
    service,
    paymentPerHour,
    deliveryTime,
    revisions,
    tags,
    completedProgramCreative,
  } = req.body;

  const gig = await Gig.findById(gigId);

  if (!gig || gig.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Gig not found"));
  }

  if (gig.creative.toString() !== userId.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only update your own gigs"),
    );
  }

  // Update fields
  if (title) gig.title = title;
  if (about) gig.about = about;
  if (service) gig.service = service;
  if (paymentPerHour) gig.paymentPerHour = paymentPerHour;
  if (deliveryTime) gig.deliveryTime = deliveryTime;
  if (revisions !== undefined) gig.revisions = revisions;
  if (tags) gig.tags = Array.isArray(tags) ? tags : [tags];
  if (completedProgramCreative)
    gig.completedProgramCreative = completedProgramCreative;
  if (service) gig.service = service;

  // Update images if provided
  if (req.files?.images) {
    // Delete old images
    for (const image of gig.images) {
      const resourceType =
        image.resource_type ||
        (image.url?.includes("/video/") ? "video" : "image");

      await deleteFromCloudinary(image.public_id, resourceType);
    }

    // Upload new images
    const images = [];
    for (const file of req.files.images) {
      const upload = await uploadOnCloudinary(file.buffer);
      images.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
    gig.images = images;
  }

  // Update reels if provided
  if (req.files?.reels) {
    // Delete old reels
    for (const reel of gig.reels) {
      const resourceType =
        reel.resource_type ||
        (reel.url?.includes("/video/") ? "video" : "image");
      await deleteFromCloudinary(reel.public_id, resourceType);
    }

    // Upload new reels
    const reels = [];
    for (const file of req.files.reels) {
      const upload = await uploadOnCloudinary(file.buffer);
      reels.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
    gig.reels = reels;
  }

  await gig.save();

  const updatedGig = await Gig.findById(gigId).populate(
    "creative",
    "name email profileImage isVerified",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gig updated successfully",
    data: updatedGig,
  });
});

// @desc    Toggle gig active status
// @route   PATCH /api/gigs/:gigId/toggle-active
// @access  Private (Creative)
export const toggleGigActive = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { gigId } = req.params;

  const gig = await Gig.findById(gigId);

  if (!gig || gig.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Gig not found"));
  }

  if (gig.creative.toString() !== userId.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only update your own gigs"),
    );
  }

  gig.isActive = !gig.isActive;
  await gig.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Gig ${gig.isActive ? "activated" : "deactivated"} successfully`,
    data: { isActive: gig.isActive },
  });
});

// @desc    Delete gig
// @route   DELETE /api/gigs/:gigId
// @access  Private (Creative)
export const deleteGig = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { gigId } = req.params;

  const gig = await Gig.findById(gigId);

  if (!gig || gig.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Gig not found"));
  }

  if (gig.creative.toString() !== userId.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only delete your own gigs"),
    );
  }

  // Soft delete
  gig.isDeleted = true;
  gig.isActive = false;
  await gig.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gig deleted successfully",
    data: null,
  });
});

// @desc    Get top rated gigs
// @route   GET /api/gigs/top-rated
// @access  Public
export const getTopRatedGigs = catchAsync(async (req, res, next) => {
  const { limit = 10, service } = req.query;

  const query = {
    isActive: true,
    isDeleted: false,
    reviewCount: { $gte: 1 },
  };

  if (service) query.service = service;

  const gigs = await Gig.find(query)
    .populate("creative", "name email profileImage isVerified")
    .sort({ rating: -1, reviewCount: -1 })
    .limit(Number(limit));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Top rated gigs retrieved successfully",
    data: gigs,
  });
});
