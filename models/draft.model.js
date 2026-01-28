import mongoose from "mongoose";

const draftSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    creative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    version: {
      type: Number,
      required: true,
      default: 1,
    },

    description: {
      type: String,
      default: "",
    },

    files: [
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
        fileName: {
          type: String,
          default: "",
        },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "revision_requested", "rejected"],
      default: "pending",
      index: true,
    },

    feedback: {
      type: String,
      default: "",
    },

    reviewedAt: {
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
draftSchema.index({ order: 1, version: -1 });
draftSchema.index({ creative: 1, createdAt: -1 });

export const Draft = mongoose.model("Draft", draftSchema);
