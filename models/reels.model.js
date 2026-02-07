import mongoose from "mongoose";

const reelSchema = new mongoose.Schema(
  {
    creative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
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

    views: {
      type: Number,
      default: 0,
    },

    likes: {
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

// Indexes
reelSchema.index({ creative: 1, isDeleted: false });

export const Reel = mongoose.model("Reel", reelSchema);
