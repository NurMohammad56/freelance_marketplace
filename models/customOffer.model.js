import mongoose from "mongoose";

const customOfferSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryTime: {
      type: Number,
      required: true,
      min: 1,
    },

    revisions: {
      type: Number,
      default: 1,
      min: 0,
    },

    requirements: {
      type: String,
      default: "",
    },

    attachments: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          default: "image",
        },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "expired"],
      default: "pending",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    respondedAt: {
      type: Date,
      default: null,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
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
customOfferSchema.index({ from: 1, to: 1, status: 1 });
customOfferSchema.index({ createdAt: -1 });
customOfferSchema.index({ expiresAt: 1, status: 1 });

export const CustomOffer = mongoose.model("CustomOffer", customOfferSchema);
