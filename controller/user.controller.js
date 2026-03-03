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
  const userId = req.user?._id;

  const {
    name,
    firstName,
    lastName,
    lng,
    lat,
    bio,
    interests,
    addWork,
    addGig,
    workTitle,
    phone,
    address,
  } = req.body;

  const combinedName =
    name ||
    [firstName, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  const files = req.files || {};
  const avatarFile = files.avatar?.[0];
  const workImages = files.workImages;
  const projectFiles = files.projects;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      ...(combinedName && { name: combinedName }),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(bio && { bio }),
      ...(interests && { interests }),
      ...(phone && { phone }),
      ...(address && { address }),
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

  if (!updatedUser) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (avatarFile) {
    const upload = await uploadOnCloudinary(avatarFile.buffer);
    updatedUser.profileImage = {
      public_id: upload.public_id,
      url: upload.secure_url,
    };
  }

  if (addWork === "true") {
    if (req.user.role !== "creative") {
      return next(new AppError(403, "Only creatives can upload works"));
    }

    if (!Array.isArray(updatedUser.works)) {
      updatedUser.works = [];
    }

    if (!workTitle) {
      return next(new AppError(400, "Work title is required"));
    }

    if (!workImages || workImages.length === 0) {
      return next(new AppError(400, "Work images are required"));
    }

    if (workImages.length > 4) {
      return next(new AppError(400, "Maximum 5 images allowed per work"));
    }

    const images = [];

    for (const file of workImages) {
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

  if (projectFiles?.length) {
    if (projectFiles.length > 4) {
      return next(new AppError(400, "Maximum 4 images allowed per work"));
    }

    if (!Array.isArray(updatedUser.projects)) {
      updatedUser.projects = [];
    }

    const images = [];
    for (const file of projectFiles) {
      const upload = await uploadOnCloudinary(file.buffer);
      images.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
    updatedUser.projects = images;
  }

  await updatedUser.save();

  const safeUser = await User.findById(userId).select(
    "-password -password_reset_token"
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: safeUser,
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
