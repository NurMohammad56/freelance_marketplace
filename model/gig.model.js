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

    paymentPerHour: {
      type: Number,
      required: true,
      min: 0,
    },

    completedProgramCreative: {
      type: String,
    },

    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],

    reels: [
      {
        public_id: { type: String },
        url: { type: String },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Gig = mongoose.model("Gig", gigSchema);
