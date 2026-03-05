import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    liker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    liked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    likeType: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
      index: true,
    },

    // Can like user profile, gig, or portfolio
    targetType: {
      type: String,
      enum: ["user"],
      default: "user",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Compound index to prevent duplicate reactions of the same type
likeSchema.index(
  { liker: 1, liked: 1, targetType: 1, likeType: 1 },
  { unique: true },
);
likeSchema.index({ liked: 1, likeType: 1 });
likeSchema.index({ createdAt: -1 });

export const Like = mongoose.model("Like", likeSchema);
