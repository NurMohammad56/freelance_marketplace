import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
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

    transactionType: {
      type: String,
      enum: [
        "order_payment",
        "premium_job_post",
        "verification_fee",
        "refund",
        "payout",
      ],
      required: true,
      index: true,
    },

    // Payment details
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

    platformFeePercentage: {
      type: Number,
      default: 20,
    },

    creativeAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "USD",
    },

    // Stripe details
    paymentIntentId: {
      type: String,
      default: "",
    },

    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "bank_transfer", "wallet"],
      default: "stripe",
    },

    stripeChargeId: {
      type: String,
      default: "",
    },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    // Payment stages
    paymentStatus: {
      client_paid: {
        type: Boolean,
        default: false,
      },
      held_by_platform: {
        type: Boolean,
        default: false,
      },
      released_to_creative: {
        type: Boolean,
        default: false,
      },
    },

    paidAt: {
      type: Date,
      default: null,
    },

    releasedAt: {
      type: Date,
      default: null,
    },

    // Admin approval for payment release
    adminApproved: {
      type: Boolean,
      default: false,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // Payout details (when paying creative)
    payoutId: {
      type: String,
      default: "",
    },

    payoutStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },

    payoutMethod: {
      type: String,
      enum: ["stripe", "paypal", "bank_transfer"],
      default: "stripe",
    },

    // Failure/Refund details
    failureReason: {
      type: String,
      default: "",
    },

    refundReason: {
      type: String,
      default: "",
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Indexes
transactionSchema.index({ client: 1, createdAt: -1 });
transactionSchema.index({ creative: 1, createdAt: -1 });
transactionSchema.index({ status: 1, transactionType: 1 });
transactionSchema.index({ "paymentStatus.released_to_creative": 1 });
transactionSchema.index({ adminApproved: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
