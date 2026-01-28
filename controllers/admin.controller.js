import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { Order } from "../models/order.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Verification } from "../models/verification.model.js";
import { Report } from "../models/report.model.js";
import { Gig } from "../models/gig.model.js";
import { JobPost } from "../models/jobPost.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { createNotification } from "../utils/notification.js";

// @desc    Get dashboard overview
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
export const getDashboardOverview = catchAsync(async (req, res, next) => {
  const totalUsers = await User.countDocuments({ isDeleted: false });
  const totalClients = await User.countDocuments({
    role: "client",
    isDeleted: false,
  });
  const totalCreatives = await User.countDocuments({
    role: "creative",
    isDeleted: false,
  });
  const totalGigs = await Gig.countDocuments({ isDeleted: false });
  const totalJobPosts = await JobPost.countDocuments({ isDeleted: false });
  const totalOrders = await Order.countDocuments({ isDeleted: false });
  const activeOrders = await Order.countDocuments({
    status: "in_progress",
    isDeleted: false,
  });
  const completedOrders = await Order.countDocuments({
    status: "completed",
    isDeleted: false,
  });

  // Revenue calculations
  const revenueStats = await Transaction.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        platformRevenue: { $sum: "$platformFee" },
        creativeRevenue: { $sum: "$creativeAmount" },
      },
    },
  ]);

  // Pending payments (awaiting admin approval)
  const pendingPayments = await Transaction.countDocuments({
    adminApproved: false,
    status: "completed",
    "paymentStatus.client_paid": true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard overview retrieved successfully",
    data: {
      users: {
        total: totalUsers,
        clients: totalClients,
        creatives: totalCreatives,
      },
      gigs: totalGigs,
      jobPosts: totalJobPosts,
      orders: {
        total: totalOrders,
        active: activeOrders,
        completed: completedOrders,
      },
      revenue: revenueStats[0] || {
        totalRevenue: 0,
        platformRevenue: 0,
        creativeRevenue: 0,
      },
      pendingPayments,
    },
  });
});

// ============ USER MANAGEMENT ============

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role, accountStatus, search, page = 1, limit = 20 } = req.query;

  const query = { isDeleted: false };

  if (role) query.role = role;
  if (accountStatus) query.accountStatus = accountStatus;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const users = await User.find(query)
    .select("-password -refreshToken -password_reset_token")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: {
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Block/Unblock user
// @route   PATCH /api/admin/users/:userId/toggle-status
// @access  Private (Admin)
export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { accountStatus } = req.body; // approved, suspended, rejected

  if (!["approved", "suspended", "rejected"].includes(accountStatus)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid account status"));
  }

  const user = await User.findById(userId);

  if (!user || user.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (user.role === "admin") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Cannot modify admin users"),
    );
  }

  user.accountStatus = accountStatus;
  await user.save();

  // Send notification
  await createNotification({
    recipient: userId,
    type:
      accountStatus === "suspended" ? "account_blocked" : "account_unblocked",
    title: `Account ${accountStatus}`,
    message: `Your account has been ${accountStatus}`,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User account ${accountStatus} successfully`,
    data: null,
  });
});

// ============ REVENUE & TRANSACTIONS ============

// @desc    Get revenue statistics
// @route   GET /api/admin/revenue
// @access  Private (Admin)
export const getRevenueStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate, search } = req.query;

  const matchQuery = { status: "completed" };

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  // Get all transactions with details
  const transactionsQuery = Transaction.find(matchQuery)
    .populate("client", "name email")
    .populate("creative", "name email")
    .populate("order", "orderId title")
    .sort({ createdAt: -1 });

  if (search) {
    const orders = await Order.find({
      $or: [
        { orderId: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    matchQuery.order = { $in: orders.map((o) => o._id) };
  }

  const transactions = await transactionsQuery;

  // Calculate totals
  const stats = await Transaction.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
        totalPlatformFee: { $sum: "$platformFee" },
        totalCreativeAmount: { $sum: "$creativeAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Group by transaction type
  const byType = await Transaction.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$transactionType",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Revenue statistics retrieved successfully",
    data: {
      transactions,
      summary: stats[0] || {
        totalAmount: 0,
        totalPlatformFee: 0,
        totalCreativeAmount: 0,
        count: 0,
      },
      byType,
    },
  });
});

// @desc    Get payment history (pending and completed)
// @route   GET /api/admin/payments
// @access  Private (Admin)
export const getPaymentHistory = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query; // pending, completed

  const query = {};

  if (status === "pending") {
    query.adminApproved = false;
    query["paymentStatus.client_paid"] = true;
    query.status = "completed";
  } else if (status === "completed") {
    query.adminApproved = true;
    query["paymentStatus.released_to_creative"] = true;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const payments = await Transaction.find(query)
    .populate("client", "name email")
    .populate("creative", "name email")
    .populate("order", "orderId title status")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Transaction.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment history retrieved successfully",
    data: {
      payments,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Approve payment (release to creative)
// @route   PATCH /api/admin/payments/:transactionId/approve
// @access  Private (Admin)
export const approvePayment = catchAsync(async (req, res, next) => {
  const { transactionId } = req.params;
  const adminId = req.user._id;

  const transaction = await Transaction.findById(transactionId);

  if (!transaction) {
    return next(new AppError(httpStatus.NOT_FOUND, "Transaction not found"));
  }

  if (transaction.adminApproved) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Payment already approved"),
    );
  }

  // Update transaction
  transaction.adminApproved = true;
  transaction.approvedBy = adminId;
  transaction.approvedAt = new Date();
  transaction.paymentStatus.released_to_creative = true;
  transaction.releasedAt = new Date();
  await transaction.save();

  // Update order payment status
  await Order.findByIdAndUpdate(transaction.order, {
    paymentStatus: "released",
    releasedAt: new Date(),
  });

  // Send notification to creative
  await createNotification({
    recipient: transaction.creative,
    type: "payment_released",
    title: "Payment Released",
    message: `Payment of $${transaction.creativeAmount.toFixed(2)} has been released to you`,
    order: transaction.order,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment approved and released to creative",
    data: null,
  });
});

// ============ VERIFICATION MANAGEMENT ============

// @desc    Get verification requests
// @route   GET /api/admin/verifications
// @access  Private (Admin)
export const getVerificationRequests = catchAsync(async (req, res, next) => {
  const { status = "pending", page = 1, limit = 20 } = req.query;

  const query = { isDeleted: false };

  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const verifications = await Verification.find(query)
    .populate("creative", "name email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Verification.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Verification requests retrieved successfully",
    data: {
      verifications,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Approve/Reject verification
// @route   PATCH /api/admin/verifications/:verificationId
// @access  Private (Admin)
export const reviewVerification = catchAsync(async (req, res, next) => {
  const { verificationId } = req.params;
  const { action, adminNotes, rejectionReason } = req.body; // approve or reject
  const adminId = req.user._id;

  const verification = await Verification.findById(verificationId);

  if (!verification || verification.isDeleted) {
    return next(
      new AppError(httpStatus.NOT_FOUND, "Verification request not found"),
    );
  }

  if (
    verification.status !== "pending" &&
    verification.status !== "under_review"
  ) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Verification already reviewed"),
    );
  }

  verification.reviewedBy = adminId;
  verification.reviewedAt = new Date();
  verification.adminNotes = adminNotes;

  if (action === "approve") {
    verification.status = "approved";
    verification.approvedAt = new Date();

    // Update user's verified status
    await User.findByIdAndUpdate(verification.creative, { isVerified: true });

    await createNotification({
      recipient: verification.creative,
      type: "verification_approved",
      title: "Verification Approved",
      message: "Congratulations! Your account has been verified",
    });
  } else if (action === "reject") {
    verification.status = "rejected";
    verification.rejectionReason = rejectionReason;

    await createNotification({
      recipient: verification.creative,
      type: "verification_rejected",
      title: "Verification Rejected",
      message: `Your verification request has been rejected. Reason: ${rejectionReason}`,
    });
  } else {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid action"));
  }

  await verification.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Verification ${action}d successfully`,
    data: null,
  });
});

// ============ REPORTS MANAGEMENT ============

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
export const getAllReports = catchAsync(async (req, res, next) => {
  const { status = "pending", reportType, page = 1, limit = 20 } = req.query;

  const query = { isDeleted: false };

  if (status) query.status = status;
  if (reportType) query.reportType = reportType;

  const skip = (Number(page) - 1) * Number(limit);

  const reports = await Report.find(query)
    .populate("reporter", "name email profileImage")
    .populate("reportedUser", "name email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Report.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reports retrieved successfully",
    data: {
      reports,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Review report and take action
// @route   PATCH /api/admin/reports/:reportId
// @access  Private (Admin)
export const reviewReport = catchAsync(async (req, res, next) => {
  const { reportId } = req.params;
  const { status, actionTaken, adminNotes } = req.body;
  const adminId = req.user._id;

  const report = await Report.findById(reportId);

  if (!report || report.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Report not found"));
  }

  report.status = status;
  report.actionTaken = actionTaken;
  report.adminNotes = adminNotes;
  report.reviewedBy = adminId;
  report.reviewedAt = new Date();

  await report.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Report reviewed successfully",
    data: null,
  });
});
