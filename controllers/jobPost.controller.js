import httpStatus from "http-status";
import { JobPost } from "../models/jobPost.model.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { processPayment } from "../utils/stripe.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { createNotification } from "../utils/notification.js";

// @desc    Create job post
// @route   POST /api/job-posts
// @access  Private (Client)
export const createJobPost = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    title,
    description,
    service,
    minBudget,
    maxBudget,
    date,
    time,
    isPremium,
  } = req.body;

  if (req.user.role !== "client") {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Only clients can create job posts"),
    );
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
      });
    }
  }

  const jobPostData = {
    client: userId,
    title,
    description,
    service,
    budget: {
      min: minBudget,
      max: maxBudget,
    },
    date,
    time,
    attachments,
    isPremium: isPremium === "true",
    status: "open",
  };

  // Set expiry date (30 days from now)
  jobPostData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const jobPost = await JobPost.create(jobPostData);

  const populatedJobPost = await JobPost.findById(jobPost._id).populate(
    "client",
    "name email profileImage",
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Job post created successfully",
    data: populatedJobPost,
  });
});

// @desc    Pay for premium job post
// @route   POST /api/job-posts/:jobPostId/pay-premium
// @access  Private (Client)
export const payPremium = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { jobPostId } = req.params;
  const { paymentMethodId } = req.body;

  const jobPost = await JobPost.findById(jobPostId);

  if (!jobPost || jobPost.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Job post not found"));
  }

  if (jobPost.client.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only pay for your own job posts",
      ),
    );
  }

  if (jobPost.isPremium && jobPost.premiumPaymentId) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Premium already paid for this job post",
      ),
    );
  }

  // Process payment via Stripe ($12)
  const paymentIntent = await processPayment({
    amount: 1200, // $12 in cents
    currency: "usd",
    paymentMethodId,
    customerId: req.user.stripeCustomerId,
    description: `Premium job post payment for: ${jobPost.title}`,
  });

  jobPost.isPremium = true;
  jobPost.premiumPaymentId = paymentIntent.id;
  jobPost.premiumPaidAt = new Date();
  await jobPost.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Premium payment successful",
    data: jobPost,
  });
});

// @desc    Get all job posts
// @route   GET /api/job-posts
// @access  Public
export const getAllJobPosts = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    service,
    minBudget,
    maxBudget,
    duration,
    status = "open",
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query = {
    isDeleted: false,
  };

  if (status) query.status = status;
  if (service) query.service = service;
  if (duration) query.duration = duration;

  if (minBudget || maxBudget) {
    query.$and = [];
    if (minBudget)
      query.$and.push({ "budget.min": { $gte: Number(minBudget) } });
    if (maxBudget)
      query.$and.push({ "budget.max": { $lte: Number(maxBudget) } });
  }

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { isPremium: -1, [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const jobPosts = await JobPost.find(query)
    .populate("client", "name email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort(sort);

  const total = await JobPost.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job posts retrieved successfully",
    data: {
      jobPosts,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalJobPosts: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Get job post by ID
// @route   GET /api/job-posts/:jobPostId
// @access  Public
export const getJobPostById = catchAsync(async (req, res, next) => {
  const { jobPostId } = req.params;

  const jobPost = await JobPost.findById(jobPostId)
    .populate("client", "name email profileImage")
    .populate("applicants.creative", "name email profileImage isVerified bio");

  if (!jobPost || jobPost.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Job post not found"));
  }

  // Increment views
  jobPost.views += 1;
  await jobPost.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job post retrieved successfully",
    data: jobPost,
  });
});

// @desc    Get client's own job posts
// @route   GET /api/job-posts/my-posts
// @access  Private (Client)
export const getMyJobPosts = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, status } = req.query;

  const query = {
    client: userId,
    isDeleted: false,
  };

  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const jobPosts = await JobPost.find(query)
    .populate("applicants.creative", "name email profileImage isVerified")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await JobPost.countDocuments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your job posts retrieved successfully",
    data: {
      jobPosts,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalJobPosts: total,
        limit: Number(limit),
      },
    },
  });
});

// @desc    Update job post
// @route   PUT /api/job-posts/:jobPostId
// @access  Private (Client)
export const updateJobPost = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { jobPostId } = req.params;
  const { title, description, service, minBudget, maxBudget, date, time } =
    req.body;

  const jobPost = await JobPost.findById(jobPostId);

  if (!jobPost || jobPost.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Job post not found"));
  }

  if (jobPost.client.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only update your own job posts",
      ),
    );
  }

  if (jobPost.status !== "open") {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot update job post that is not open",
      ),
    );
  }

  // Update fields
  if (title) jobPost.title = title;
  if (description) jobPost.description = description;
  if (service) jobPost.service = service;
  if (date) jobPost.date = date;
  if (time) jobPost.time = time;

  if (minBudget || maxBudget) {
    if (minBudget) jobPost.budget.min = minBudget;
    if (maxBudget) jobPost.budget.max = maxBudget;
  }

  // Update attachments if provided
  if (req.files && req.files.length > 0) {
    // Delete old attachments
    for (const attachment of jobPost.attachments) {
      await deleteFromCloudinary(attachment.public_id);
    }

    // Upload new attachments
    const attachments = [];
    for (const file of req.files) {
      const upload = await uploadOnCloudinary(file.buffer);
      attachments.push({
        public_id: upload.public_id,
        url: upload.secure_url,
        fileType: file.mimetype.startsWith("image") ? "image" : "document",
      });
    }
    jobPost.attachments = attachments;
  }

  await jobPost.save();

  const updatedJobPost = await JobPost.findById(jobPostId).populate(
    "client",
    "name email profileImage",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job post updated successfully",
    data: updatedJobPost,
  });
});

// @desc    Apply to job post (Creative)
// @route   POST /api/job-posts/:jobPostId/apply
// @access  Private (Creative)
export const applyToJobPost = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { jobPostId } = req.params;
  const { proposal, bidAmount, deliveryTime } = req.body;

  if (req.user.role !== "creative") {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only creatives can apply to job posts",
      ),
    );
  }

  const jobPost = await JobPost.findById(jobPostId);

  if (!jobPost || jobPost.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Job post not found"));
  }

  if (jobPost.status !== "open") {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "This job post is no longer accepting applications",
      ),
    );
  }

  // Check if already applied
  const alreadyApplied = jobPost.applicants.some(
    (applicant) => applicant.creative.toString() === userId.toString(),
  );

  if (alreadyApplied) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "You have already applied to this job post",
      ),
    );
  }

  // Add application
  jobPost.applicants.push({
    creative: userId,
    proposal,
    bidAmount,
    deliveryTime,
    status: "pending",
  });

  await jobPost.save();

  // Send notification to client
  await createNotification({
    recipient: jobPost.client,
    sender: userId,
    type: "job_application",
    title: "New Job Application",
    message: `A creative has applied to your job post: ${jobPost.title}`,
    jobPost: jobPostId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Application submitted successfully",
    data: null,
  });
});

// @desc    Shortlist/Reject applicant
// @route   PATCH /api/job-posts/:jobPostId/applicants/:applicantId
// @access  Private (Client)
export const updateApplicantStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { jobPostId, applicantId } = req.params;
  const { status } = req.body; // shortlisted, rejected

  const jobPost = await JobPost.findById(jobPostId);

  if (!jobPost || jobPost.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Job post not found"));
  }

  if (jobPost.client.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only manage your own job post applicants",
      ),
    );
  }

  const applicant = jobPost.applicants.id(applicantId);
  if (!applicant) {
    return next(new AppError(httpStatus.NOT_FOUND, "Applicant not found"));
  }

  if (!["shortlisted", "rejected"].includes(status)) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid status"));
  }

  applicant.status = status;
  await jobPost.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Applicant ${status} successfully`,
    data: null,
  });
});

// @desc    Close job post
// @route   PATCH /api/job-posts/:jobPostId/close
// @access  Private (Client)
export const closeJobPost = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { jobPostId } = req.params;

  const jobPost = await JobPost.findById(jobPostId);

  if (!jobPost || jobPost.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Job post not found"));
  }

  if (jobPost.client.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only close your own job posts",
      ),
    );
  }

  jobPost.status = "closed";
  await jobPost.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job post closed successfully",
    data: null,
  });
});

// @desc    Delete job post
// @route   DELETE /api/job-posts/:jobPostId
// @access  Private (Client)
export const deleteJobPost = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { jobPostId } = req.params;

  const jobPost = await JobPost.findById(jobPostId);

  if (!jobPost || jobPost.isDeleted) {
    return next(new AppError(httpStatus.NOT_FOUND, "Job post not found"));
  }

  if (jobPost.client.toString() !== userId.toString()) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "You can only delete your own job posts",
      ),
    );
  }

  // Soft delete
  jobPost.isDeleted = true;
  await jobPost.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job post deleted successfully",
    data: null,
  });
});
