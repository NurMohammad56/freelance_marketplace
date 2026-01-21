import catchAsync from "../utils/catchAsync.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import { Gig } from "../model/gig.model.js";

export const createGig = catchAsync(async (req, res, next) => {
  if (req.user.role !== "creative") {
    return next(new AppError(403, "Only creatives can create gigs"));
  }

  const { title, about, paymentPerHour, completedProgramCreative } = req.body;

  if (!title || !paymentPerHour) {
    return next(new AppError(400, "Title and payment per hour are required"));
  }

  const images = [];
  const reels = [];

  if (req.files?.images) {
    for (const file of req.files.images) {
      const upload = await uploadOnCloudinary(file.buffer);
      images.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
  }

  if (req.files?.reels) {
    for (const file of req.files.reels) {
      const upload = await uploadOnCloudinary(file.buffer);
      reels.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
  }

  const gig = await Gig.create({
    creative: req.user._id,
    title,
    about,
    paymentPerHour,
    completedProgramCreative,
    images,
    reels,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Gig created successfully",
    data: gig,
  });
});

export const getMyGigs = catchAsync(async (req, res) => {
  const gigs = await Gig.find({ creative: req.user._id }).sort({
    createdAt: -1,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My gigs fetched successfully",
    data: gigs,
  });
});

export const getPublicGigs = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, q } = req.query;

  const filter = { isActive: true };

  if (q) {
    filter.title = new RegExp(q, "i");
  }

  const gigs = await Gig.find(filter)
    .populate("creative", "name profileImage bio")
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gigs fetched successfully",
    data: gigs,
  });
});

export const updateGig = catchAsync(async (req, res, next) => {
  const { gigId } = req.params;

  const gig = await Gig.findById(gigId);
  if (!gig) return next(new AppError(404, "Gig not found"));

  if (String(gig.creative) !== String(req.user._id)) {
    return next(new AppError(403, "Forbidden"));
  }

  const { title, about, paymentPerHour, completedProgramCreative } = req.body;

  if (title) gig.title = title;
  if (about) gig.about = about;
  if (paymentPerHour) gig.paymentPerHour = paymentPerHour;
  if (typeof completedProgramCreative !== "undefined") {
    gig.completedProgramCreative = completedProgramCreative;
  }

  await gig.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gig updated successfully",
    data: gig,
  });
});

export const deleteGig = catchAsync(async (req, res, next) => {
  const { gigId } = req.params;

  const gig = await Gig.findById(gigId);
  if (!gig) return next(new AppError(404, "Gig not found"));

  if (String(gig.creative) !== String(req.user._id)) {
    return next(new AppError(403, "Forbidden"));
  }

  await gig.deleteOne();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gig deleted successfully",
  });
});
