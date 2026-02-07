import httpStatus from "http-status";
import { Reel } from "../models/reels.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

export const createReels = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { tags } = req.body;

  const videos = [];
  if (req.files.reels) {
    const upload = await Promise.all(
      req.files.reels.map((file) => uploadOnCloudinary(file.buffer)),
    );

    for (const video of upload) {
      videos.push({
        public_id: video.public_id,
        url: video.secure_url,
      });
    }
  }

  if (videos.length === 0) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "At least one video is required"),
    );
  }

  const reels = await Reel.create({
    user: userId,
    videos,
    tags,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Reels created successfully",
    data: reels,
  });
});
