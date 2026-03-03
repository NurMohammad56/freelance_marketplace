import httpStatus from "http-status";
import { Draft } from "../models/draft.model.js";
import { Order } from "../models/order.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { createNotification } from "../utils/notification.js";

// @desc    Submit draft
// @route   POST /api/orders/:orderId/drafts
// @access  Private (Creative)
export const submitDraft = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId } = req.params;
  const { description } = req.body;

  const order = await Order.findById(orderId);

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  if (order.creative.toString() !== userId.toString()) {
    return next(new AppError(httpStatus.FORBIDDEN, "Only the assigned creative can submit drafts"));
  }

  if (order.status !== "in_progress" && order.status !== "revision_requested") {
    return next(new AppError(httpStatus.BAD_REQUEST, "Order is not in the correct status for draft submission"));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError(httpStatus.BAD_REQUEST, "At least one file is required"));
  }

  // Upload files
  const files = [];
  for (const file of req.files) {
    const upload = await uploadOnCloudinary(file.buffer);
    files.push({
      public_id: upload.public_id,
      url: upload.secure_url,
      fileType: file.mimetype.startsWith("image") ? "image" : file.mimetype.startsWith("video") ? "video" : "document",
      fileName: file.originalname,
    });
  }

  // Get current draft version
  const existingDrafts = await Draft.find({ order: orderId }).sort({ version: -1 });
  const version = existingDrafts.length > 0 ? existingDrafts[0].version + 1 : 1;

  // Create draft
  const draft = await Draft.create({
    order: orderId,
    creative: userId,
    version,
    description,
    files,
    status: "pending",
  });

  // Update order
  order.drafts.push(draft._id);
  order.status = "submitted";
  await order.save();

  // Send notification to client
  await createNotification({
    recipient: order.client,
    sender: userId,
    type: "draft_submitted",
    title: "Draft Submitted",
    message: `A new draft (v${version}) has been submitted for order: ${order.orderId}`,
    order: order._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Draft submitted successfully",
    data: draft,
  });
});

// @desc    Get order drafts
// @route   GET /api/orders/:orderId/drafts
// @access  Private (Client or Creative)
export const getOrderDrafts = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order || order.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Order not found"));
  }

  // Check authorization
  if (
    order.client.toString() !== userId.toString() &&
    order.creative.toString() !== userId.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError(httpStatus.FORBIDDEN, "You don't have access to this order"));
  }

  const drafts = await Draft.find({ order: orderId, isDeleted: false })
    .populate("creative", "name email profileImage")
    .sort({ version: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Drafts retrieved successfully",
    data: drafts,
  });
});

// @desc    Get draft by ID
// @route   GET /api/drafts/:draftId
// @access  Private
export const getDraftById = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { draftId } = req.params;

  const draft = await Draft.findById(draftId)
    .populate("creative", "name email profileImage")
    .populate({
      path: "order",
      populate: [
        { path: "client", select: "name email" },
        { path: "creative", select: "name email" },
      ],
    });

  if (!draft || draft.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Draft not found"));
  }

  // Check authorization
  if (
    draft.order.client.toString() !== userId.toString() &&
    draft.order.creative.toString() !== userId.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError(httpStatus.FORBIDDEN, "You don't have access to this draft"));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Draft retrieved successfully",
    data: draft,
  });
});

// @desc    Approve draft (Client)
// @route   PATCH /api/drafts/:draftId/approve
// @access  Private (Client)
export const approveDraft = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { draftId } = req.params;

  const draft = await Draft.findById(draftId).populate("order");

  if (!draft || draft.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Draft not found"));
  }

  if (draft.order.client.toString() !== userId.toString()) {
    return next(new AppError(httpStatus.FORBIDDEN, "Only the client can approve drafts"));
  }

  if (draft.status !== "pending") {
    return next(new AppError(httpStatus.BAD_REQUEST, "Draft is not in pending status"));
  }

  draft.status = "approved";
  draft.reviewedAt = new Date();
  await draft.save();

  // Update order status
  const order = await Order.findById(draft.order._id);
  order.status = "completed";
  order.completedAt = new Date();
  await order.save();

  // Send notification to creative
  await createNotification({
    recipient: draft.creative,
    sender: userId,
    type: "draft_approved",
    title: "Draft Approved",
    message: `Your draft (v${draft.version}) has been approved for order: ${order.orderId}`,
    order: order._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Draft approved successfully",
    data: null,
  });
});

// @desc    Request revision (Client)
// @route   PATCH /api/drafts/:draftId/request-revision
// @access  Private (Client)
export const requestRevision = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { draftId } = req.params;
  const { feedback } = req.body;

  const draft = await Draft.findById(draftId).populate("order");

  if (!draft || draft.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Draft not found"));
  }

  if (draft.order.client.toString() !== userId.toString()) {
    return next(new AppError(httpStatus.FORBIDDEN, "Only the client can request revisions"));
  }

  if (draft.status !== "pending") {
    return next(new AppError(httpStatus.BAD_REQUEST, "Draft is not in pending status"));
  }

  const order = await Order.findById(draft.order._id);

  // Check if revisions are available
  if (order.revisions.used >= order.revisions.allowed) {
    return next(new AppError(httpStatus.BAD_REQUEST, "No more revisions available for this order"));
  }

  draft.status = "revision_requested";
  draft.feedback = feedback;
  draft.reviewedAt = new Date();
  await draft.save();

  // Update order
  order.status = "revision_requested";
  order.revisions.used += 1;
  await order.save();

  // Send notification to creative
  await createNotification({
    recipient: draft.creative,
    sender: userId,
    type: "draft_revision_requested",
    title: "Revision Requested",
    message: `A revision has been requested for draft (v${draft.version}) in order: ${order.orderId}`,
    order: order._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Revision requested successfully",
    data: null,
  });
});

// @desc    Reject draft (Client)
// @route   PATCH /api/drafts/:draftId/reject
// @access  Private (Client)
export const rejectDraft = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { draftId } = req.params;
  const { feedback } = req.body;

  const draft = await Draft.findById(draftId).populate("order");

  if (!draft || draft.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Draft not found"));
  }

  if (draft.order.client.toString() !== userId.toString()) {
    return next(new AppError(httpStatus.FORBIDDEN, "Only the client can reject drafts"));
  }

  if (draft.status !== "pending") {
    return next(new AppError(httpStatus.BAD_REQUEST, "Draft is not in pending status"));
  }

  draft.status = "rejected";
  draft.feedback = feedback;
  draft.reviewedAt = new Date();
  await draft.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Draft rejected",
    data: null,
  });
});

// @desc    Delete draft (Creative)
// @route   DELETE /api/drafts/:draftId
// @access  Private (Creative)
export const deleteDraft = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { draftId } = req.params;

  const draft = await Draft.findById(draftId);

  if (!draft || draft.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Draft not found"));
  }

  if (draft.creative.toString() !== userId.toString()) {
    return next(new AppError(httpStatus.FORBIDDEN, "You can only delete your own drafts"));
  }

  if (draft.status !== "pending") {
    return next(new AppError(httpStatus.BAD_REQUEST, "Can only delete drafts that are pending"));
  }

  // Delete files from cloudinary
  for (const file of draft.files) {
    await deleteFromCloudinary(file.public_id);
  }

  draft.isDeleted = true;
  await draft.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Draft deleted successfully",
    data: null,
  });
});