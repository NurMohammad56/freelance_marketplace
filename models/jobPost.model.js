import mongoose from "mongoose";

const jobPostSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    service: {
      type: String,
      default: "",
      required: true,
      lowercase: true,
    },

    budget: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
    },

    date: {
      type: Date,
      default: Date.now,
    },

    time: {
      type: String,
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

    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },

    premiumPaymentId: {
      type: String,
      default: "",
    },

    premiumPaidAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "cancelled", "closed"],
      default: "open",
      index: true,
    },

    applicants: [
      {
        creative: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
        proposal: {
          type: String,
          default: "",
        },
        bidAmount: {
          type: Number,
          required: true,
        },
        deliveryTime: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "shortlisted", "rejected", "hired"],
          default: "pending",
        },
      },
    ],

    hiredCreative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
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

// Text search index
jobPostSchema.index({
  title: "text",
  description: "text",
});
jobPostSchema.index({ category: 1, status: 1, isPremium: -1 });
jobPostSchema.index({ createdAt: -1 });
jobPostSchema.index({ "budget.min": 1, "budget.max": 1 });

export const JobPost = mongoose.model("JobPost", jobPostSchema);
