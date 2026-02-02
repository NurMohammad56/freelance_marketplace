import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    creative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // Payment for verification
    paymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentIntentId: {
      type: String,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // Documents submitted by creative
    documents: [
      {
        type: {
          type: String,
          enum: ["id_proof", "work_proof", "portfolio", "certificate", "other"],
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          default: "",
        },
      },
    ],

    // Additional info
    portfolio_links: [
      {
        type: String,
        trim: true,
      },
    ],

    description: {
      type: String,
      default: "",
    },

    // Admin review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    adminNotes: {
      type: String,
      default: "",
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    approvedAt: {
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
verificationSchema.index({ creative: 1, status: 1 });
verificationSchema.index({ status: 1, createdAt: -1 });

export const Verification = mongoose.model("Verification", verificationSchema);
