import httpStatus from "http-status";
import { Category } from "../models/category.model.js";
import { Verification } from "../models/verification.model.js";
import { SupportTicket } from "../models/supportTicket.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { processPayment } from "../utils/stripe.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { createNotification } from "../utils/notification.js";

// ============ CATEGORY CONTROLLERS ============

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const generateSlug = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const parseBooleanInput = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") return true;
    if (normalizedValue === "false") return false;
  }
  return null;
};

const normalizeSubCategories = (subCategories) => {
  if (subCategories === undefined) return undefined;

  let parsedSubCategories = subCategories;

  if (typeof parsedSubCategories === "string") {
    const trimmedSubCategories = parsedSubCategories.trim();
    if (!trimmedSubCategories) return [];

    if (
      trimmedSubCategories.startsWith("[") ||
      trimmedSubCategories.startsWith("{")
    ) {
      try {
        parsedSubCategories = JSON.parse(trimmedSubCategories);
      } catch (error) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "subCategories must be a valid JSON array",
        );
      }
    } else {
      parsedSubCategories = [trimmedSubCategories];
    }
  }

  if (!Array.isArray(parsedSubCategories)) {
    parsedSubCategories = [parsedSubCategories];
  }

  return parsedSubCategories.map((subCategory) => {
    const normalizedSubCategory =
      typeof subCategory === "string" ? { name: subCategory } : subCategory;

    const subCategoryName = normalizedSubCategory?.name?.toString().trim();
    if (!subCategoryName) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Each sub-category must include a name",
      );
    }

    const subCategorySlug = generateSlug(
      normalizedSubCategory.slug || subCategoryName,
    );

    if (!subCategorySlug) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid sub-category slug value",
      );
    }

    return {
      name: subCategoryName,
      slug: subCategorySlug,
      description: normalizedSubCategory.description?.toString().trim() || "",
    };
  });
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin)
export const createCategory = catchAsync(async (req, res, next) => {
  const { name, slug, description = "", order = 0, subCategories, isActive } =
    req.body;

  const categoryName = name?.toString().trim();
  if (!categoryName) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Category name is required"));
  }

  const categorySlug = generateSlug(slug || categoryName);
  if (!categorySlug) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid category slug value"));
  }

  const parsedOrder = Number(order);
  if (Number.isNaN(parsedOrder)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Order must be a valid number"));
  }

  const parsedIsActive =
    isActive === undefined ? true : parseBooleanInput(isActive);
  if (parsedIsActive === null) {
    return next(new AppError(httpStatus.BAD_REQUEST, "isActive must be true or false"));
  }

  const existingCategory = await Category.findOne({
    $or: [
      { slug: categorySlug },
      {
        name: {
          $regex: `^${escapeRegex(categoryName)}$`,
          $options: "i",
        },
      },
    ],
  });

  if (existingCategory) {
    return next(
      new AppError(
        httpStatus.CONFLICT,
        "Category with this name or slug already exists",
      ),
    );
  }

  const normalizedSubCategories = normalizeSubCategories(subCategories);

  const categoryData = {
    name: categoryName,
    slug: categorySlug,
    description: description?.toString().trim() || "",
    order: parsedOrder,
    isActive: parsedIsActive,
    subCategories: normalizedSubCategories || [],
  };

  if (req.file) {
    const upload = await uploadOnCloudinary(req.file.buffer, {
      folder: "fiverr-platform/categories",
    });
    categoryData.icon = {
      public_id: upload.public_id,
      url: upload.secure_url,
    };
  }

  const category = await Category.create(categoryData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({
    isActive: true,
    isDeleted: false,
  }).sort({ order: 1, name: 1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: categories,
  });
});

// @desc    Get category by ID
// @route   GET /api/categories/:categoryId
// @access  Public
export const getCategoryById = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);

  if (!category || category.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Category not found"));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category retrieved successfully",
    data: category,
  });
});

// @desc    Update category
// @route   PATCH /api/categories/:categoryId
// @access  Private (Admin)
export const updateCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const { name, slug, description, order, subCategories, isActive } = req.body;

  const category = await Category.findById(categoryId);

  if (!category || category.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Category not found"));
  }

  if (name !== undefined) {
    const categoryName = name?.toString().trim();
    if (!categoryName) {
      return next(new AppError(httpStatus.BAD_REQUEST, "Category name cannot be empty"));
    }

    const duplicateName = await Category.findOne({
      _id: { $ne: categoryId },
      name: {
        $regex: `^${escapeRegex(categoryName)}$`,
        $options: "i",
      },
    });

    if (duplicateName) {
      return next(new AppError(httpStatus.CONFLICT, "Category name already exists"));
    }

    category.name = categoryName;
  }

  if (slug !== undefined) {
    const categorySlug = generateSlug(slug);
    if (!categorySlug) {
      return next(new AppError(httpStatus.BAD_REQUEST, "Invalid category slug value"));
    }

    const duplicateSlug = await Category.findOne({
      _id: { $ne: categoryId },
      slug: categorySlug,
    });

    if (duplicateSlug) {
      return next(new AppError(httpStatus.CONFLICT, "Category slug already exists"));
    }

    category.slug = categorySlug;
  }

  if (description !== undefined) {
    category.description = description?.toString().trim() || "";
  }

  if (order !== undefined) {
    const parsedOrder = Number(order);
    if (Number.isNaN(parsedOrder)) {
      return next(new AppError(httpStatus.BAD_REQUEST, "Order must be a valid number"));
    }
    category.order = parsedOrder;
  }

  if (isActive !== undefined) {
    const parsedIsActive = parseBooleanInput(isActive);
    if (parsedIsActive === null) {
      return next(new AppError(httpStatus.BAD_REQUEST, "isActive must be true or false"));
    }
    category.isActive = parsedIsActive;
  }

  if (subCategories !== undefined) {
    category.subCategories = normalizeSubCategories(subCategories);
  }

  if (req.file) {
    if (category.icon?.public_id) {
      const resourceType = category.icon.url?.includes("/video/")
        ? "video"
        : "image";
      await deleteFromCloudinary(category.icon.public_id, resourceType);
    }

    const upload = await uploadOnCloudinary(req.file.buffer, {
      folder: "fiverr-platform/categories",
    });

    category.icon = {
      public_id: upload.public_id,
      url: upload.secure_url,
    };
  }

  await category.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: category,
  });
});

// ============ VERIFICATION CONTROLLERS ============

// @desc    Request verification (Creative)
// @route   POST /api/verifications/request
// @access  Private (Creative)
export const requestVerification = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { description, portfolioLinks, paymentMethodId } = req.body;

  if (req.user.role !== "creative") {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only creatives can request verification",
      ),
    );
  }

  // Check if already verified
  if (req.user.isVerified) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Your account is already verified"),
    );
  }

  // Check for pending verification
  const pendingVerification = await Verification.findOne({
    creative: userId,
    status: { $in: ["pending", "under_review"] },
    isDeleted: false,
  });

  if (pendingVerification) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "You already have a pending verification request",
      ),
    );
  }

  if (!req.files || req.files.length === 0) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "At least one document is required"),
    );
  }

  // Upload documents
  const documents = [];
  for (const file of req.files) {
    const upload = await uploadOnCloudinary(file.buffer);
    documents.push({
      type: "portfolio", // Can be extended to support different types
      public_id: upload.public_id,
      url: upload.secure_url,
      fileName: file.originalname,
    });
  }

  // Process payment (verification fee)
  const verificationFee = process.env.VERIFICATION_FEE || 50; // $50 default
  const paymentIntent = await processPayment({
    amount: verificationFee * 100,
    currency: "usd",
    paymentMethodId,
    customerId: req.user.stripeCustomerId,
    description: "Blue badge verification fee",
  });

  // Create verification request
  const verification = await Verification.create({
    creative: userId,
    status: "pending",
    paymentAmount: verificationFee,
    paymentIntentId: paymentIntent.id,
    paymentStatus: "completed",
    paidAt: new Date(),
    documents,
    portfolio_links: portfolioLinks
      ? Array.isArray(portfolioLinks)
        ? portfolioLinks
        : [portfolioLinks]
      : [],
    description,
  });

  // Send notification to admins (would need to query admin users)
  // await createNotification({...});

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Verification request submitted successfully",
    data: verification,
  });
});

// @desc    Get verification status
// @route   GET /api/verifications/my-status
// @access  Private (Creative)
export const getVerificationStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const verification = await Verification.findOne({
    creative: userId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Verification status retrieved successfully",
    data: verification,
  });
});

// ============ SUPPORT TICKET CONTROLLERS ============

// Generate unique ticket ID
const generateTicketId = () => {
  return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
};

// @desc    Create support ticket
// @route   POST /api/support/tickets
// @access  Private
export const createSupportTicket = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { subject, category, priority = "medium", description } = req.body;

  const validCategories = [
    "account",
    "payment",
    "order",
    "technical",
    "verification",
    "report",
    "feature_request",
    "other",
  ];
  if (!validCategories.includes(category)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid category"));
  }

  // Upload attachments if provided
  const attachments = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const upload = await uploadOnCloudinary(file.buffer);
      attachments.push({
        public_id: upload.public_id,
        url: upload.secure_url,
        fileType: file.mimetype.startsWith("image") ? "image" : "document",
        fileName: file.originalname,
      });
    }
  }

  const ticket = await SupportTicket.create({
    user: userId,
    ticketId: generateTicketId(),
    subject,
    category,
    priority,
    description,
    attachments,
    status: "open",
  });

  const populatedTicket = await SupportTicket.findById(ticket._id).populate(
    "user",
    "name email profileImage",
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Support ticket created successfully",
    data: populatedTicket,
  });
});

// @desc    Get user's support tickets
// @route   GET /api/support/my-tickets
// @access  Private
export const getMyTickets = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = {
    user: userId,
    isDeleted: false,
  };

  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const tickets = await SupportTicket.find(query)
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await SupportTicket.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support tickets retrieved successfully",
    data: {
      tickets,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get ticket by ID
// @route   GET /api/support/tickets/:ticketId
// @access  Private
export const getTicketById = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { ticketId } = req.params;

  const ticket = await SupportTicket.findById(ticketId)
    .populate("user", "name email profileImage")
    .populate("assignedTo", "name email")
    .populate("resolvedBy", "name email");

  if (!ticket || ticket.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Support ticket not found"));
  }

  // Check authorization
  if (
    ticket.user.toString() !== userId.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You don't have access to this ticket",
      ),
    );
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Support ticket retrieved successfully",
    data: ticket,
  });
});

// @desc    Update ticket status (Admin)
// @route   PATCH /api/support/tickets/:ticketId/status
// @access  Private (Admin)
export const updateTicketStatus = catchAsync(async (req, res, next) => {
  const { ticketId } = req.params;
  const { status, resolution } = req.body;
  const adminId = req.user._id;

  const validStatuses = [
    "open",
    "in_progress",
    "waiting_for_user",
    "resolved",
    "closed",
  ];
  if (!validStatuses.includes(status)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid status"));
  }

  const ticket = await SupportTicket.findById(ticketId);

  if (!ticket || ticket.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Support ticket not found"));
  }

  ticket.status = status;

  if (status === "resolved" || status === "closed") {
    ticket.resolvedBy = adminId;
    ticket.resolvedAt = new Date();
    if (resolution) ticket.resolution = resolution;
  }

  if (status === "in_progress" && !ticket.assignedTo) {
    ticket.assignedTo = adminId;
    ticket.assignedAt = new Date();
  }

  await ticket.save();

  // Send notification to user
  await createNotification({
    recipient: ticket.user,
    type: "support_reply",
    title: "Support Ticket Update",
    message: `Your support ticket has been updated to: ${status}`,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ticket status updated successfully",
    data: null,
  });
});

// @desc    Rate support ticket (User)
// @route   PATCH /api/support/tickets/:ticketId/rate
// @access  Private
export const rateTicket = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { ticketId } = req.params;
  const { rating, feedback } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Rating must be between 1 and 5"),
    );
  }

  const ticket = await SupportTicket.findById(ticketId);

  if (!ticket || ticket.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Support ticket not found"));
  }

  if (ticket.user.toString() !== userId.toString()) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "You can only rate your own tickets"),
    );
  }

  if (ticket.status !== "resolved" && ticket.status !== "closed") {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Can only rate resolved or closed tickets",
      ),
    );
  }

  ticket.rating = rating;
  ticket.feedback = feedback;
  await ticket.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ticket rated successfully",
    data: null,
  });
});
