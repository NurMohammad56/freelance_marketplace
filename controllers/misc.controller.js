import httpStatus from "http-status";
import { Category } from "../models/category.model.js";
import { Verification } from "../models/verification.model.js";
import { SupportTicket } from "../models/supportTicket.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { processPayment } from "../utils/stripe.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { createNotification } from "../utils/notification.js";

// ============ CATEGORY CONTROLLERS ============

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

// Export all functions
export {
  // Category
  getAllCategories,
  getCategoryById,
  // Verification
  requestVerification,
  getVerificationStatus,
  // Support
  createSupportTicket,
  getMyTickets,
  getTicketById,
  updateTicketStatus,
  rateTicket,
};
