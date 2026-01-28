import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "order_placed",
        "order_completed",
        "order_cancelled",
        "work_reminder",
        "reschedule_request",
        "reschedule_accepted",
        "reschedule_rejected",
        "booking_confirmed",
        "booking_denied",
        "custom_offer_received",
        "custom_offer_accepted",
        "custom_offer_rejected",
        "draft_submitted",
        "draft_approved",
        "draft_revision_requested",
        "review_received",
        "message_received",
        "verification_approved",
        "verification_rejected",
        "payment_received",
        "payment_released",
        "job_application",
        "job_hired",
        "support_reply",
        "account_blocked",
        "account_unblocked",
      ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Related entities
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      default: null,
    },

    jobPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      default: null,
    },

    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },

    customOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomOffer",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
