import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    public_id: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const websiteSchema = new mongoose.Schema(
  {
    hero: {
      title: { type: String, default: "" },
      bodyText: { type: String, default: "" },
      image: { type: imageSchema, default: () => ({}) },
    },
    about: {
      title: { type: String, default: "" },
      bodyText: { type: String, default: "" },
      image: { type: imageSchema, default: () => ({}) },
    },
    creative: {
      title: { type: String, default: "" },
      bodyText: { type: String, default: "" },
      heroImage: { type: imageSchema, default: () => ({}) },
      images: { type: [imageSchema], default: [] },
    },
    client: {
      title: { type: String, default: "" },
      bodyText: { type: String, default: "" },
      image: { type: imageSchema, default: () => ({}) },
    },
    contact: {
      address: { type: String, default: "" },
      phoneNumber: { type: String, default: "" },
      email: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const Website = mongoose.model("Website", websiteSchema);
