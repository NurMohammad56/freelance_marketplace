import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    creative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      default: null,
    },

    jobPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      default: null,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    platformFee: {
      type: Number,
      required: true,
      default: 0,
    },

    creativeAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryTime: {
      type: Number,
      required: true,
      min: 1,
    },

    requirements: {
      type: String,
      default: "",
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

    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "submitted",
        "revision_requested",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "pending",
      index: true,
    },

    // Custom offer related
    isCustomOffer: {
      type: Boolean,
      default: false,
    },

    customOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomOffer",
      default: null,
    },

    // Drafts submitted by creative
    drafts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Draft",
      },
    ],

    // Payment tracking
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "released", "refunded"],
      default: "pending",
      index: true,
    },

    paymentIntentId: {
      type: String,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    releasedAt: {
      type: Date,
      default: null,
    },

    // Deadlines
    startedAt: {
      type: Date,
      default: null,
    },

    deadline: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // Reschedule requests
    rescheduleRequests: [
      {
        requestedBy: {
          type: String,
          enum: ["client", "creative"],
          required: true,
        },
        newDeadline: {
          type: Date,
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Cancellation
    cancellationReason: {
      type: String,
      default: "",
    },

    cancelledBy: {
      type: String,
      enum: ["client", "creative", "admin"],
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    // Revision tracking
    revisions: {
      allowed: {
        type: Number,
        default: 1,
      },
      used: {
        type: Number,
        default: 0,
      },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
orderSchema.index({ client: 1, status: 1 });
orderSchema.index({ creative: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deadline: 1, status: 1 });
orderSchema.index({ paymentStatus: 1 });

export const Order = mongoose.model("Order", orderSchema);
