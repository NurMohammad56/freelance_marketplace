import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

export const getProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select(
    "-password -password_reset_token -refreshToken",
  );

  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: user,
  });
});

export const getUserById = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .select(
      "-password -password_reset_token -refreshToken -emailVerificationOTP -emailVerificationOTPExpiry",
    )
    .select("-settings");

  if (!user || user.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: user,
  });
});

export const updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { name, phone, address, bio, interests, lng, lat, specialRole } =
    req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (bio) user.bio = bio;

  if (interests) {
    user.interests = [
      ...new Set(
        (Array.isArray(interests) ? interests : [interests]).map((i) =>
          i.trim(),
        ),
      ),
    ];
  }

  if (lng !== undefined && lat !== undefined) {
    user.locationGeo = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)],
    };
  }

  if (req.file?.buffer) {
    if (user.profileImage?.public_id) {
      const resourceType =
        user.profileImage.resource_type ||
        (user.profileImage.url.includes("/video/") ? "video" : "image");

      await deleteFromCloudinary(user.profileImage.public_id, resourceType);
    }

    const upload = await uploadOnCloudinary(req.file.buffer);

    user.profileImage = {
      public_id: upload.public_id,
      url: upload.secure_url,
      resource_type: upload.resource_type,
    };
  }

  if (req.user.role === "creative") {
    if (specialRole) {
      user.specialRole = specialRole;
    }
  }

  await user.save();

  const sanitizedUser = await User.findById(userId).select(
    "-password -refreshToken",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: sanitizedUser,
  });
});

export const addWork = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { workTitle } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (user.role !== "client") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Only client can upload works"),
    );
  }

  if (!workTitle) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Work title is required"));
  }

  if (!req.files || req.files.length === 0) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Work images are required"),
    );
  }

  if (req.files.length > 5) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Maximum 5 images allowed per work"),
    );
  }

  const images = [];
  for (const file of req.files) {
    const upload = await uploadOnCloudinary(file.buffer);
    images.push({
      public_id: upload.public_id,
      url: upload.secure_url,
    });
  }

  user.works.push({
    title: workTitle,
    images,
  });

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Work added successfully",
    data: user.works[user.works.length - 1],
  });
});

export const deleteWork = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { workId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  const work = user.works.id(workId);
  if (!work) {
    return next(new AppError(httpStatus.NOT_FOUND, "Work not found"));
  }

  for (const image of work.images) {
    const resourceType =
      image.resource_type ||
      (image.url?.includes("/video/") ? "video" : "image");

    await deleteFromCloudinary(image.public_id, resourceType);
  }

  user.works.pull(workId);
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work deleted successfully",
    data: null,
  });
});

export const addProject = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { projectTitle } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (user.role !== "client") {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only clients can upload featured projects",
      ),
    );
  }

  if (
    !req.files ||
    (req.files.images?.length === 0 && req.files.videos?.length === 0)
  ) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "At least one image or video is required",
      ),
    );
  }

  const images = [];
  const videos = [];

  // Upload images
  if (req.files.images) {
    if (req.files.images.length > 5) {
      return next(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Maximum 5 images allowed per project",
        ),
      );
    }

    for (const file of req.files.images) {
      const upload = await uploadOnCloudinary(file.buffer);
      images.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
  }

  // Upload videos
  if (req.files.videos) {
    if (req.files.videos.length > 3) {
      return next(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Maximum 3 videos allowed per project",
        ),
      );
    }

    for (const file of req.files.videos) {
      const upload = await uploadOnCloudinary(file.buffer);
      videos.push({
        public_id: upload.public_id,
        url: upload.secure_url,
      });
    }
  }

  user.projects.push({
    title: projectTitle || "",
    images,
    videos,
  });

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Featured project added successfully",
    data: user.projects[user.projects.length - 1],
  });
});

export const deleteProject = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { projectId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  const project = user.projects.id(projectId);
  if (!project) {
    return next(new AppError(httpStatus.NOT_FOUND, "Project not found"));
  }

  // Delete images from cloudinary
  for (const image of project.images) {
    const resourceType =
      image.resource_type ||
      (image.url?.includes("/video/") ? "video" : "image");

    await deleteFromCloudinary(image.public_id, resourceType);
  }

  // Delete videos from cloudinary
  for (const video of project.videos) {
    const resourceType =
      video.resource_type ||
      (video.url?.includes("/video/") ? "video" : "image");
    await deleteFromCloudinary(video.public_id, resourceType);
  }

  user.projects.pull(projectId);
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Featured project deleted successfully",
    data: null,
  });
});

export const updateSettings = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { emailNotifications, pushNotifications, chatNotifications } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (emailNotifications !== undefined) {
    user.settings.emailNotifications = emailNotifications;
  }
  if (pushNotifications !== undefined) {
    user.settings.pushNotifications = pushNotifications;
  }
  if (chatNotifications !== undefined) {
    user.settings.chatNotifications = chatNotifications;
  }

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Settings updated successfully",
    data: user.settings,
  });
});

export const deleteAccount = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { password } = req.body;

  const user = await User.findById(userId).select("+password");
  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  // Verify password
  const isPasswordMatch = await User.isPasswordMatched(password, user.password);
  if (!isPasswordMatch) {
    return next(new AppError(httpStatus.UNAUTHORIZED, "Incorrect password"));
  }

  // Soft delete
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.refreshToken = "";
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account deleted successfully",
    data: null,
  });
});

export const getNearbyUsers = catchAsync(async (req, res, next) => {
  const { lng, lat, maxDistance = 50000, role } = req.query; // maxDistance in meters (default 50km)

  if (!lng || !lat) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Longitude and latitude are required",
      ),
    );
  }

  const query = {
    locationGeo: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: Number(maxDistance),
      },
    },
    isDeleted: false,
    accountStatus: "approved",
  };

  if (role) {
    query.role = role;
  }

  if (req.user._id) {
    query._id = { $ne: req.user._id };
  }

  const users = await User.find(query)
    .select(
      "-password -password_reset_token -refreshToken -emailVerificationOTP",
    )
    .limit(50);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Nearby users retrieved successfully",
    data: users,
  });
});

export const searchUsers = catchAsync(async (req, res, next) => {
  const { query, role, page = 1, limit = 20 } = req.query;

  const searchQuery = {
    isDeleted: false,
    accountStatus: "approved",
  };

  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: "i" } },
      { bio: { $regex: query, $options: "i" } },
      { interests: { $in: [new RegExp(query, "i")] } },
    ];
  }

  if (role) {
    searchQuery.role = role;
  }

  if (req.user._id) {
    searchQuery._id = { $ne: req.user._id };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const users = await User.find(searchQuery)
    .select(
      "-password -password_reset_token -refreshToken -emailVerificationOTP",
    )
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(searchQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: {
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalUsers: total,
        limit: Number(limit),
      },
    },
  });
});
