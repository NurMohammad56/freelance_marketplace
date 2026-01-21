import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

export const getProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const u = await User.findById(userId).select(
    "-password -password_reset_token"
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Public profile",
    data: u,
  });
});

export const updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const { name, lng, lat, bio, interests, addWork, addGig, workTitle } =
    req.body;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      ...(name && { name }),
      ...(bio && { bio }),
      ...(interests && { interests }),
      ...(lng &&
        lat && {
          locationGeo: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
        }),
    },
    { new: true }
  );

  if (req.file) {
    const upload = await uploadOnCloudinary(req.file.buffer);
    updatedUser.profileImage = {
      public_id: upload.public_id,
      url: upload.secure_url,
    };
  }

  if (addWork === "true") {
    if (userId.role !== "creative") {
      return next(new AppError(403, "Only creatives can upload works"));
    }

    if (!workTitle) {
      return next(new AppError(400, "Work title is required"));
    }

    if (!req.files || req.files.length === 0) {
      return next(new AppError(400, "Work images are required"));
    }

    if (req.files.length > 4) {
      return next(new AppError(400, "Maximum 5 images allowed per work"));
    }

    const images = [];

    for (const file of req.files) {
      const upload = await uploadOnCloudinary(file.buffer);
      images.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }

    updatedUser.works.push({
      title: workTitle,
      images,
    });
  }

  if (req.files.projects) {
    if (req.files.projects.length > 4) {
      return next(new AppError(400, "Maximum 4 images allowed per work"));
    }

    const images = [];
    for (const file of req.files.projects) {
      const upload = await uploadOnCloudinary(file.buffer);
      images.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
    updatedUser.projects = images;
  }

  await updatedUser.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword)
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords don't match");

  const user = await User.findById(req.user._id).select("+password");

  if (!(await User.isPasswordMatched(currentPassword, user.password))) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Current password wrong");
  }
  user.password = newPassword;

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed",
  });
});
