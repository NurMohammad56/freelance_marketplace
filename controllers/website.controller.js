import AppError from "../errors/AppError.js";
import { Website } from "../models/website.model.js";
import { uploadOnCloudinary } from "../utils/commonMethod.js";
import {
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
} from "../utils/cloudinary.js";
import catchAsync from "../utils/catchAsync.js";
import sendResponse from "../utils/sendResponse.js";

const ensureWebsite = async () => {
  const existing = await Website.findOne();
  if (existing) return existing;
  return Website.create({});
};

const saveSingleImage = async (file) => {
  if (!file) return null;
  const uploaded = await uploadOnCloudinary(file.buffer);
  return { public_id: uploaded.public_id, url: uploaded.secure_url };
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;

  const normalized = String(value).trim().toLowerCase();
  return ["true", "1", "yes"].includes(normalized);
};

const safeDeleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await deleteFromCloudinary(publicId, "image");
  } catch (error) {
    // Keep request successful even if external deletion fails.
    console.error("Cloudinary single image delete failed:", error?.message);
  }
};

const safeDeleteCloudinaryImages = async (publicIds = []) => {
  const filteredIds = publicIds.filter(Boolean);
  if (!filteredIds.length) return;

  try {
    await deleteMultipleFromCloudinary(filteredIds, "image");
  } catch (error) {
    console.error("Cloudinary multiple image delete failed:", error?.message);
  }
};

const parsePublicIds = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        String(item)
          .split(",")
          .map((id) => id.trim()),
      )
      .filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((id) => String(id).trim()).filter(Boolean);
    }
  } catch {
    // ignore json parse failure and fallback to csv parsing
  }

  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
};

const saveMultipleImages = async (files = []) => {
  const images = [];
  for (const file of files) {
    const image = await saveSingleImage(file);
    if (image) images.push(image);
  }
  return images;
};

const hasHero = (hero) => !!(hero?.title || hero?.bodyText || hero?.image?.url);
const hasAbout = (about) =>
  !!(about?.title || about?.bodyText || about?.image?.url);
const hasCreative = (creative) =>
  !!(
    creative?.title ||
    creative?.bodyText ||
    creative?.heroImage?.url ||
    (creative?.images && creative.images.length)
  );
const hasClient = (client) =>
  !!(client?.title || client?.bodyText || client?.image?.url);
const hasContact = (contact) =>
  !!(contact?.address || contact?.phoneNumber || contact?.email);

export const createHeroSection = catchAsync(async (req, res, next) => {
  const { title, bodyText } = req.body;
  if (!title || !bodyText) {
    return next(new AppError(400, "Title and body text are required"));
  }

  const website = await ensureWebsite();
  if (hasHero(website.hero)) {
    return next(
      new AppError(400, "Hero section already exists, use update instead"),
    );
  }

  const heroImage = await saveSingleImage(req.files?.image?.[0]);

  website.hero = {
    title,
    bodyText,
    ...(heroImage ? { image: heroImage } : {}),
  };
  await website.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Hero section created successfully",
    data: website.hero,
  });
});

export const updateHeroSection = catchAsync(async (req, res, next) => {
  const website = await ensureWebsite();
  if (!hasHero(website.hero)) {
    return next(new AppError(404, "Hero section not found"));
  }

  const { title, bodyText, removeImage } = req.body;
  const heroImage = await saveSingleImage(req.files?.image?.[0]);

  if (title) website.hero.title = title;
  if (bodyText) website.hero.bodyText = bodyText;

  if (toBoolean(removeImage) && website.hero?.image?.public_id) {
    await safeDeleteCloudinaryImage(website.hero.image.public_id);
    website.hero.image = { public_id: "", url: "" };
  }

  if (heroImage) {
    if (website.hero?.image?.public_id) {
      await safeDeleteCloudinaryImage(website.hero.image.public_id);
    }
    website.hero.image = heroImage;
  }

  await website.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Hero section updated successfully",
    data: website.hero,
  });
});

export const getHeroSection = catchAsync(async (req, res) => {
  const website = await ensureWebsite();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Hero section fetched successfully",
    data: website.hero,
  });
});

export const createAboutSection = catchAsync(async (req, res, next) => {
  const { title, bodyText } = req.body;
  if (!title || !bodyText) {
    return next(new AppError(400, "Title and body text are required"));
  }

  const website = await ensureWebsite();
  if (hasAbout(website.about)) {
    return next(
      new AppError(400, "About section already exists, use update instead"),
    );
  }

  const aboutImage = await saveSingleImage(req.files?.image?.[0]);
  website.about = {
    title,
    bodyText,
    ...(aboutImage ? { image: aboutImage } : {}),
  };
  await website.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "About section created successfully",
    data: website.about,
  });
});

export const updateAboutSection = catchAsync(async (req, res, next) => {
  const website = await ensureWebsite();
  if (!hasAbout(website.about)) {
    return next(new AppError(404, "About section not found"));
  }

  const { title, bodyText, removeImage } = req.body;
  const aboutImage = await saveSingleImage(req.files?.image?.[0]);

  if (title) website.about.title = title;
  if (bodyText) website.about.bodyText = bodyText;

  if (toBoolean(removeImage) && website.about?.image?.public_id) {
    await safeDeleteCloudinaryImage(website.about.image.public_id);
    website.about.image = { public_id: "", url: "" };
  }

  if (aboutImage) {
    if (website.about?.image?.public_id) {
      await safeDeleteCloudinaryImage(website.about.image.public_id);
    }
    website.about.image = aboutImage;
  }

  await website.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "About section updated successfully",
    data: website.about,
  });
});

export const getAboutSection = catchAsync(async (req, res) => {
  const website = await ensureWebsite();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "About section fetched successfully",
    data: website.about,
  });
});

export const createCreativeSection = catchAsync(async (req, res, next) => {
  const { title, bodyText } = req.body;
  if (!title || !bodyText) {
    return next(new AppError(400, "Title and body text are required"));
  }

  const website = await ensureWebsite();
  if (hasCreative(website.creative)) {
    return next(
      new AppError(400, "Creative section already exists, use update instead"),
    );
  }

  const heroImage = await saveSingleImage(req.files?.heroImage?.[0]);
  const images = await saveMultipleImages(req.files?.images);

  website.creative = {
    title,
    bodyText,
    ...(heroImage ? { heroImage } : {}),
    ...(images.length ? { images } : {}),
  };
  await website.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Creative section created successfully",
    data: website.creative,
  });
});

export const updateCreativeSection = catchAsync(async (req, res, next) => {
  const website = await ensureWebsite();
  if (!hasCreative(website.creative)) {
    return next(new AppError(404, "Creative section not found"));
  }

  const { title, bodyText, removeHeroImage, removeImagePublicIds } = req.body;
  const heroImage = await saveSingleImage(req.files?.heroImage?.[0]);
  const uploadedImages = await saveMultipleImages(req.files?.images);
  const imageIdsToRemove = parsePublicIds(removeImagePublicIds);

  if (title) website.creative.title = title;
  if (bodyText) website.creative.bodyText = bodyText;

  if (toBoolean(removeHeroImage) && website.creative?.heroImage?.public_id) {
    await safeDeleteCloudinaryImage(website.creative.heroImage.public_id);
    website.creative.heroImage = { public_id: "", url: "" };
  }

  if (heroImage) {
    if (website.creative?.heroImage?.public_id) {
      await safeDeleteCloudinaryImage(website.creative.heroImage.public_id);
    }
    website.creative.heroImage = heroImage;
  }

  if (imageIdsToRemove.length) {
    await safeDeleteCloudinaryImages(imageIdsToRemove);
    website.creative.images = (website.creative.images || []).filter(
      (image) => !imageIdsToRemove.includes(image.public_id),
    );
  }

  if (uploadedImages.length) {
    website.creative.images = [
      ...(website.creative.images || []),
      ...uploadedImages,
    ];
  }

  await website.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Creative section updated successfully",
    data: website.creative,
  });
});

export const getCreativeSection = catchAsync(async (req, res) => {
  const website = await ensureWebsite();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Creative section fetched successfully",
    data: website.creative,
  });
});

export const createClientSection = catchAsync(async (req, res, next) => {
  const { title, bodyText } = req.body;
  if (!title || !bodyText) {
    return next(new AppError(400, "Title and body text are required"));
  }

  const website = await ensureWebsite();
  if (hasClient(website.client)) {
    return next(
      new AppError(400, "Client section already exists, use update instead"),
    );
  }

  const image = await saveSingleImage(req.files?.image?.[0]);
  website.client = {
    title,
    bodyText,
    ...(image ? { image } : {}),
  };
  await website.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Client section created successfully",
    data: website.client,
  });
});

export const updateClientSection = catchAsync(async (req, res, next) => {
  const website = await ensureWebsite();
  if (!hasClient(website.client)) {
    return next(new AppError(404, "Client section not found"));
  }

  const { title, bodyText, removeImage } = req.body;
  const image = await saveSingleImage(req.files?.image?.[0]);

  if (title) website.client.title = title;
  if (bodyText) website.client.bodyText = bodyText;

  if (toBoolean(removeImage) && website.client?.image?.public_id) {
    await safeDeleteCloudinaryImage(website.client.image.public_id);
    website.client.image = { public_id: "", url: "" };
  }

  if (image) {
    if (website.client?.image?.public_id) {
      await safeDeleteCloudinaryImage(website.client.image.public_id);
    }
    website.client.image = image;
  }

  await website.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Client section updated successfully",
    data: website.client,
  });
});

export const getClientSection = catchAsync(async (req, res) => {
  const website = await ensureWebsite();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Client section fetched successfully",
    data: website.client,
  });
});

export const createContactSection = catchAsync(async (req, res, next) => {
  const { address, phoneNumber, email } = req.body;
  if (!address || !phoneNumber || !email) {
    return next(
      new AppError(400, "Address, phone number, and email are required"),
    );
  }

  const website = await ensureWebsite();
  if (hasContact(website.contact)) {
    return next(
      new AppError(400, "Contact section already exists, use update instead"),
    );
  }

  website.contact = { address, phoneNumber, email };
  await website.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Contact section created successfully",
    data: website.contact,
  });
});

export const updateContactSection = catchAsync(async (req, res, next) => {
  const website = await ensureWebsite();
  if (!hasContact(website.contact)) {
    return next(new AppError(404, "Contact section not found"));
  }

  const { address, phoneNumber, email } = req.body;

  if (address) website.contact.address = address;
  if (phoneNumber) website.contact.phoneNumber = phoneNumber;
  if (email) website.contact.email = email;

  await website.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contact section updated successfully",
    data: website.contact,
  });
});

export const getContactSection = catchAsync(async (req, res) => {
  const website = await ensureWebsite();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contact section fetched successfully",
    data: website.contact,
  });
});

export const getWebsiteContent = catchAsync(async (req, res) => {
  const website = await ensureWebsite();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Website content fetched successfully",
    data: website,
  });
});
