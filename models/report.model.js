import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reportType: {
      type: String,
      enum: ["user", "gig", "order", "review", "message"],
      required: true,
    },

    // Related entities
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      default: null,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      default: null,
    },

    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    reason: {
      type: String,
      enum: [
        "spam",
        "harassment",
        "inappropriate_content",
        "fraud",
        "fake_profile",
        "poor_quality",
        "unprofessional",
        "scam",
        "fake_reviews",
        "copyright_violation",
        "other",
      ],
      required: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    evidence: [
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

    status: {
      type: String,
      enum: ["pending", "under_review", "resolved", "rejected"],
      default: "pending",
      index: true,
    },

    adminNotes: {
      type: String,
      default: "",
    },

    actionTaken: {
      type: String,
      enum: [
        "none",
        "warning",
        "content_removed",
        "user_blocked",
        "user_suspended",
      ],
      default: "none",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
reportSchema.index({ reporter: 1, reportedUser: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1, status: 1 });

export const Report = mongoose.model("Report", reportSchema);
