import mongoose from "mongoose";

const gigSchema = new mongoose.Schema(
  {
    creative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    about: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    subCategory: {
      type: String,
      default: "",
    },

    paymentPerHour: {
      type: Number,
      required: true,
      min: 0,
    },

    completedProgramCreative: {
      type: String,
      default: "",
    },

    images: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],

    reels: [
      {
        public_id: {
          type: String,
        },
        url: {
          type: String,
        },
      },
    ],

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    deliveryTime: {
      type: Number,
      default: 1,
      min: 1,
    },

    revisions: {
      type: Number,
      default: 1,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Stats
    totalOrders: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Index for search and filtering
gigSchema.index({ title: "text", about: "text", tags: "text" });
gigSchema.index({ category: 1, isActive: 1 });
gigSchema.index({ rating: -1, reviewCount: -1 });
gigSchema.index({ createdAt: -1 });

export const Gig = mongoose.model("Gig", gigSchema);
