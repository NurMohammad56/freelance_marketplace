import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    creative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      default: null,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      default: "",
    },

    // Rating breakdown
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },

    serviceQuality: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },

    delivery: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },

    // Creative can delete reviews
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // Admin can flag inappropriate reviews
    isFlagged: {
      type: Boolean,
      default: false,
    },

    flagReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Indexes
reviewSchema.index({ creative: 1, isDeleted: false });
reviewSchema.index({ client: 1 });
reviewSchema.index({ gig: 1, isDeleted: false });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
