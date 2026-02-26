import express from "express";
import * as chatController from "../controllers/chat.controller.js";
import * as messageController from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Chat
router.post("/chat", protect, chatController.createChat);
router.get("/chat", protect, chatController.getUserChats);
router.get("/chat/:chatId", protect, chatController.getChatById);
router.put("/chat/:chatId", protect, chatController.updateChat);
router.put("/chat/:chatId/block", protect, chatController.blockChat);

// Message
router.post("/message", protect, messageController.sendMessage);
router.get("/message/:chatId", protect, messageController.getMessagesByChatId);
router.put("/message/:messageId", protect, messageController.updateMessage);
router.delete("/message/:messageId", protect, messageController.deleteMessage);
// router.put("/message/:messageId/read", protect, messageController.markAsRead);

export default router;