import httpStatus from "http-status";
import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { Chat } from "../models/chat.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";

/**
 * SEND MESSAGE
 */
export const sendMessage = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const {
    chatId,
    content,
    messageType = "text",
    media = [],
    location,
    customOffer,
  } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat || chat.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  if (chat.isBlocked) {
    return next(new AppError(httpStatus.FORBIDDEN, "Chat is blocked"));
  }

  const message = await Message.create({
    chat: chatId,
    sender: userId,
    content,
    messageType,
    media,
    location,
    customOffer,
    readBy: [{ user: userId }],
  });

  // update chat last message
  chat.lastMessage = message._id;
  chat.lastMessageAt = message.createdAt;

  chat.participants.forEach((participant) => {
    const id = participant.toString();

    if (id !== userId.toString()) {
      const count = chat.unreadCount.get(id) || 0;
      chat.unreadCount.set(id, count + 1);
    }
  });

  await chat.save();

  const populatedMessage = await Message.findById(message._id)
    .populate("sender", "name profileImage");

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Message sent successfully",
    data: populatedMessage,
  });
});

/**
 * GET MESSAGES BY CHAT ID
 */
export const getMessagesByChatId = catchAsync(async (req, res) => {
  const { chatId } = req.params;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const messages = await Message.find({
    chat: chatId,
    isDeleted: false,
    deletedFor: { $ne: req.user._id },
  })
    .populate("sender", "name profileImage")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messages retrieved successfully",
    data: messages.reverse(),
  });
});

/**
 * UPDATE MESSAGE
 */
export const updateMessage = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const { content } = req.body;

  const message = await Message.findById(messageId);

  if (!message) {
    return next(new AppError(httpStatus.NOT_FOUND, "Message not found"));
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only edit your message"),
    );
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();

  await message.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message updated successfully",
    data: message,
  });
});

/**
 * DELETE MESSAGE
 */
export const deleteMessage = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    return next(new AppError(httpStatus.NOT_FOUND, "Message not found"));
  }

  message.deletedFor.push(req.user._id);

  await message.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message deleted successfully",
    data: message,
  });
});

/**
 * MARK MESSAGE AS READ
 */
export const markMessageAsRead = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  await Message.findByIdAndUpdate(messageId, {
    $addToSet: {
      readBy: {
        user: userId,
        readAt: new Date(),
      },
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message marked as read",
  });
});