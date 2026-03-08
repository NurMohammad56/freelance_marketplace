import httpStatus from "http-status";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";
import { Chat } from "../models/chat.model.js";
import { getIO } from "../utils/socket.js";

/**
 * CREATE CHAT
 */
export const createChat = catchAsync(async (req, res, next) => {
  const { participants = [], chatType = "direct", supportTicket } = req.body;
  const userId = req.user._id;

  if (!Array.isArray(participants)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "participants must be an array"));
  }

  const uniqueParticipants = [
    ...new Set([...participants.map(String), userId.toString()]),
  ];

  if (chatType === "direct" && uniqueParticipants.length < 2) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Direct chat requires at least one other participant",
      ),
    );
  }

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

  const io = getIO();
  if (io) {
    uniqueParticipants.forEach((participantId) => {
      io.to(`user_${participantId}`).emit("chat:new", chat);
    });
  }

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

  const isParticipant = chat.participants.some(
    (participant) => participant._id.toString() === req.user._id.toString(),
  );
  if (!isParticipant) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You are not allowed to view this chat"),
    );
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

  const currentChat = await Chat.findById(chatId);
  if (!currentChat || currentChat.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  const isParticipant = currentChat.participants.some(
    (participant) => participant.toString() === req.user._id.toString(),
  );
  if (!isParticipant) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You are not allowed to update this chat",
      ),
    );
  }

  const updatableFields = ["lastMessage", "lastMessageAt", "unreadCount"];
  const payload = {};
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  });

  const chat = await Chat.findByIdAndUpdate(chatId, payload, { new: true });

  if (!chat) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  const io = getIO();
  if (io) {
    chat.participants.forEach((participant) => {
      io.to(`user_${participant.toString()}`).emit("chat:updated", chat);
    });
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

  const currentChat = await Chat.findById(chatId);
  if (!currentChat || currentChat.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  const isParticipant = currentChat.participants.some(
    (participant) => participant.toString() === req.user._id.toString(),
  );
  if (!isParticipant) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You are not allowed to block this chat"),
    );
  }

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

  const io = getIO();
  if (io) {
    chat.participants.forEach((participant) => {
      io.to(`user_${participant.toString()}`).emit("chat:blocked", {
        chatId: chat._id,
        blockedBy: req.user._id,
      });
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat blocked successfully",
    data: chat,
  });
});
