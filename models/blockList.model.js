import mongoose from "mongoose";

const blockListSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    blocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      default: "",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Compound index to prevent duplicate blocks
blockListSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockListSchema.index({ createdAt: -1 });

export const BlockList = mongoose.model("BlockList", blockListSchema);
