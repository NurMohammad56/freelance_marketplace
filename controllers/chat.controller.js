import httpStatus from "http-status";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";
import { Chat } from "../models/chat.model.js";

/**
 * CREATE CHAT
 */
export const createChat = catchAsync(async (req, res, next) => {
  const { participants = [], chatType = "direct", supportTicket } = req.body;
  const userId = req.user._id;

  const uniqueParticipants = [
    ...new Set([...participants.map(String), userId.toString()]),
  ];

  // check existing direct chat
  if (chatType === "direct") {
    const existingChat = await Chat.findOne({
      chatType: "direct",
      participants: {
        $all: uniqueParticipants,
        $size: uniqueParticipants.length,
      },
      isDeleted: false,
    });

    if (existingChat) {
      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Chat already exists",
        data: existingChat,
      });
    }
  }

  // unread map init
  const unreadCount = new Map();
  uniqueParticipants.forEach((id) => unreadCount.set(id, 0));

  const chat = await Chat.create({
    participants: uniqueParticipants,
    chatType,
    supportTicket,
    unreadCount,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Chat created successfully",
    data: chat,
  });
});

/**
 * GET USER CHATS
 */
export const getUserChats = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const chats = await Chat.find({
    participants: userId,
    isDeleted: false,
  })
    .populate("participants", "name profileImage email")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name profileImage",
      },
    })
    .sort({ lastMessageAt: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chats retrieved successfully",
    data: chats,
  });
});

/**
 * GET CHAT BY ID
 */
export const getChatById = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid chat ID"));
  }

  const chat = await Chat.findById(chatId)
    .populate("participants", "name profileImage email")
    .populate("blockedBy", "name")
    .populate("supportTicket")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name profileImage",
      },
    });

  if (!chat || chat.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat retrieved successfully",
    data: chat,
  });
});

/**
 * UPDATE CHAT
 */
export const updateChat = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;

  const chat = await Chat.findByIdAndUpdate(chatId, req.body, {
    new: true,
  });

  if (!chat) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat updated successfully",
    data: chat,
  });
});

/**
 * BLOCK CHAT
 */
export const blockChat = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;

  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      isBlocked: true,
      blockedBy: req.user._id,
    },
    { new: true },
  );

  if (!chat) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat blocked successfully",
    data: chat,
  });
});