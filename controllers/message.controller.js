import httpStatus from "http-status";
import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { Chat } from "../models/chat.model.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";
import AppError from "../errors/AppError.js";
import { getIO } from "../utils/socket.js";

const ensureChatAccess = async (chatId, userId, next) => {
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid chat ID"));
  }

  const chat = await Chat.findById(chatId);
  if (!chat || chat.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Chat not found"));
  }

  const isParticipant = chat.participants.some(
    (participant) => participant.toString() === userId.toString(),
  );

  if (!isParticipant) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You are not allowed to access this chat",
      ),
    );
  }

  return chat;
};

/**
 * SEND MESSAGE
 */
export const sendMessage = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const {
    chatId,
    content = "",
    messageType = "text",
    media = [],
    location,
    customOffer,
  } = req.body;

  const chat = await ensureChatAccess(chatId, userId, next);
  if (!chat) return;

  if (chat.isBlocked) {
    return next(new AppError(httpStatus.FORBIDDEN, "Chat is blocked"));
  }

  const hasMessagePayload =
    content?.toString().trim() ||
    (Array.isArray(media) && media.length > 0) ||
    location ||
    customOffer;

  if (!hasMessagePayload) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Message content cannot be empty"),
    );
  }

  const message = await Message.create({
    chat: chatId,
    sender: userId,
    content: content?.toString().trim() || "",
    messageType,
    media,
    location,
    customOffer,
    readBy: [{ user: userId }],
  });

  // Update chat state
  chat.lastMessage = message._id;
  chat.lastMessageAt = message.createdAt;

  chat.participants.forEach((participant) => {
    const participantId = participant.toString();
    if (participantId !== userId.toString()) {
      const count = chat.unreadCount.get(participantId) || 0;
      chat.unreadCount.set(participantId, count + 1);
    }
  });

  await chat.save();

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "name profileImage",
  );

  const io = getIO();
  if (io) {
    io.to(`conv_${chatId}`).emit("message:new", populatedMessage);

    chat.participants.forEach((participant) => {
      const participantId = participant.toString();
      if (participantId !== userId.toString()) {
        io.to(`user_${participantId}`).emit("chat:unread", {
          chatId,
          unreadCount: chat.unreadCount.get(participantId) || 0,
          lastMessage: populatedMessage,
        });
      }
    });
  }

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
export const getMessagesByChatId = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const chat = await ensureChatAccess(chatId, userId, next);
  if (!chat) return;

  const query = {
    chat: chatId,
    isDeleted: false,
    deletedFor: { $ne: userId },
  };

  const messages = await Message.find(query)
    .populate("sender", "name profileImage")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Message.countDocuments(query);

  // Mark unread messages as read by this user
  const unreadMessageIds = await Message.find({
    ...query,
    "readBy.user": { $ne: userId },
  }).distinct("_id");

  if (unreadMessageIds.length > 0) {
    await Message.updateMany(
      { _id: { $in: unreadMessageIds } },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date(),
          },
        },
      },
    );
  }

  const participantId = userId.toString();
  const currentUnread = chat.unreadCount.get(participantId) || 0;
  if (currentUnread > 0) {
    chat.unreadCount.set(participantId, 0);
    await chat.save();
  }

  const io = getIO();
  if (io && unreadMessageIds.length > 0) {
    io.to(`conv_${chatId}`).emit("chat:read", {
      chatId,
      userId,
      messageIds: unreadMessageIds,
      readAt: new Date(),
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messages retrieved successfully",
    data: {
      messages: messages.reverse(),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    },
  });
});

/**
 * UPDATE MESSAGE
 */
export const updateMessage = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content?.toString().trim()) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Content is required"));
  }

  const message = await Message.findById(messageId);

  if (!message || message.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Message not found"));
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only edit your message"),
    );
  }

  message.content = content.toString().trim();
  message.isEdited = true;
  message.editedAt = new Date();

  await message.save();

  const populatedMessage = await Message.findById(messageId).populate(
    "sender",
    "name profileImage",
  );

  const io = getIO();
  if (io) {
    io.to(`conv_${message.chat.toString()}`).emit("message:updated", populatedMessage);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message updated successfully",
    data: populatedMessage,
  });
});

/**
 * DELETE MESSAGE (for current user)
 */
export const deleteMessage = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message || message.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Message not found"));
  }

  const chat = await ensureChatAccess(message.chat.toString(), userId, next);
  if (!chat) return;

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { deletedFor: userId } },
    { new: true },
  );

  const io = getIO();
  if (io) {
    io.to(`user_${userId.toString()}`).emit("message:deleted", {
      chatId: message.chat,
      messageId,
      deletedFor: userId,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message deleted successfully",
    data: updatedMessage,
  });
});

/**
 * MARK MESSAGE AS READ
 */
export const markMessageAsRead = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid message ID"));
  }

  const message = await Message.findById(messageId);
  if (!message || message.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Message not found"));
  }

  const chat = await ensureChatAccess(message.chat.toString(), userId, next);
  if (!chat) return;

  await Message.findByIdAndUpdate(messageId, {
    $addToSet: {
      readBy: {
        user: userId,
        readAt: new Date(),
      },
    },
  });

  const participantId = userId.toString();
  if ((chat.unreadCount.get(participantId) || 0) > 0) {
    chat.unreadCount.set(participantId, 0);
    await chat.save();
  }

  const io = getIO();
  if (io) {
    io.to(`conv_${message.chat.toString()}`).emit("message:read", {
      chatId: message.chat,
      messageId,
      userId,
      readAt: new Date(),
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message marked as read",
    data: null,
  });
});
