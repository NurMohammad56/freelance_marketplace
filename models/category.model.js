import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    icon: {
      public_id: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },

    subCategories: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        slug: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        description: {
          type: String,
          default: "",
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    // Stats
    gigCount: {
      type: Number,
      default: 0,
    },

    jobPostCount: {
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
categorySchema.index({ isActive: 1, order: 1 });

export const Category = mongoose.model("Category", categorySchema);
