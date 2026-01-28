import httpStatus from "http-status";
import { Notification } from "../models/notification.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, isRead } = req.query;

  const query = {
    recipient: userId,
    isDeleted: false,
  };

  if (isRead !== undefined) {
    query.isRead = isRead === "true";
  }

  const skip = (Number(page) - 1) * Number(limit);

  const notifications = await Notification.find(query)
    .populate("sender", "name profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications retrieved successfully",
    data: {
      notifications,
      unreadCount,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalNotifications: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Unread count retrieved successfully",
    data: { count },
  });
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:notificationId/read
// @access  Private
export const markAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);

  if (!notification || notification.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Notification not found"));
  }

  if (notification.recipient.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only mark your own notifications as read",
      ),
    );
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: null,
  });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { recipient: userId, isRead: false, isDeleted: false },
    { isRead: true, readAt: new Date() },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: null,
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:notificationId
// @access  Private
export const deleteNotification = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);

  if (!notification || notification.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Notification not found"));
  }

  if (notification.recipient.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only delete your own notifications",
      ),
    );
  }

  notification.isDeleted = true;
  await notification.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification deleted successfully",
    data: null,
  });
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
export const clearAllNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { recipient: userId, isDeleted: false },
    { isDeleted: true },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications cleared successfully",
    data: null,
  });
});
