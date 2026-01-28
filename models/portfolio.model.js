import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
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

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      required: true,
      index: true,
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

    videos: [
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

    projectUrl: {
      type: String,
      default: "",
    },

    completionDate: {
      type: Date,
      default: null,
    },

    client: {
      type: String,
      default: "",
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

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
portfolioSchema.index({ creative: 1, isDeleted: false });
portfolioSchema.index({ category: 1 });
portfolioSchema.index({ isFeatured: -1, createdAt: -1 });
portfolioSchema.index({ title: "text", description: "text", tags: "text" });

export const Portfolio = mongoose.model("Portfolio", portfolioSchema);
