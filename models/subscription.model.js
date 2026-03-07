import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    includes: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ name: 1, billingCycle: 1, createdAt: -1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
