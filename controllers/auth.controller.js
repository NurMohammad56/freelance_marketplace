import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catchAsync.js";
import { sendEmail } from "../utils/sendEmail.js";

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ _id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  });

  return { accessToken, refreshToken };
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const forgotPasswordEmailTemplate = (name, otp) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2 style="margin-bottom: 8px;">Password Reset OTP</h2>
    <p>Hi ${name || "there"},</p>
    <p>We received a request to reset your account password.</p>
    <p style="margin: 16px 0;">
      Use this OTP to continue:
      <strong style="font-size: 20px; letter-spacing: 2px;">${otp}</strong>
    </p>
    <p>This OTP will expire in 10 minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  </div>
`;

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, phone, address } = req.body;

  // Check if user already exists
  const existingUser = await User.isUserExistsByEmail(email);
  if (existingUser) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Email already registered"),
    );
  }

  // Validate role
  if (!["client", "creative"].includes(role)) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Invalid role. Must be 'client' or 'creative'",
      ),
    );
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    address,
    emailVerificationOTP: otp,
    emailVerificationOTPExpiry: otpExpiry,
    isEmailVerified: false,
  });

  // Send OTP email
  await sendEmail({
    to: email,
    subject: "Email Verification - OTP",
    html: `<p>Your OTP for email verification is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`,
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Update refresh token in database
  user.refreshToken = refreshToken;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message:
      "User registered successfully. Please verify your email with OTP sent to your email.",
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    },
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.isUserExistsByEmail(email);
  if (!user) {
    return next(
      new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password"),
    );
  }

  // Check if account is suspended or rejected
  if (user.accountStatus === "suspended") {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Your account has been suspended. Please contact support.",
      ),
    );
  }

  if (user.accountStatus === "rejected") {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Your account has been rejected. Please contact support.",
      ),
    );
  }

  // Check if account is deleted
  if (user.isDeleted) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Your account has been deleted."),
    );
  }

  // Check password
  const isPasswordMatch = await User.isPasswordMatched(password, user.password);
  if (!isPasswordMatch) {
    return next(
      new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password"),
    );
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Update refresh token
  user.refreshToken = refreshToken;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful",
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        accountStatus: user.accountStatus,
      },
      accessToken,
      refreshToken,
    },
  });
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (user.isEmailVerified) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Email already verified"));
  }

  // Check OTP
  if (user.emailVerificationOTP !== otp) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid OTP"));
  }

  // Check OTP expiry
  if (new Date() > user.emailVerificationOTPExpiry) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "OTP has expired. Please request a new one.",
      ),
    );
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationOTP = null;
  user.emailVerificationOTPExpiry = null;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email verified successfully",
    data: {
      user: {
        _id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    },
  });
});

export const resendOTP = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError(httpStatus.NOT_FOUND, "User not found"));
  }

  if (user.isEmailVerified) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Email already verified"));
  }

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.emailVerificationOTP = otp;
  user.emailVerificationOTPExpiry = otpExpiry;
  await user.save();

  // Send OTP email
  await sendEmail({
    to: user.email,
    subject: "Email Verification - New OTP",
    text: `Your new OTP for email verification is: ${otp}. Valid for 10 minutes.`,
    html: `<p>Your new OTP for email verification is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "New OTP sent to your email",
    data: null,
  });
});

export const refreshAccessToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(
      new AppError(httpStatus.UNAUTHORIZED, "Refresh token required"),
    );
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return next(
      new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired refresh token"),
    );
  }

  // Check if user exists and token matches
  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== refreshToken) {
    return next(new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token"));
  }

  // Generate new tokens
  const tokens = generateTokens(user._id);

  // Update refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refreshed successfully",
    data: tokens,
  });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(
      new AppError(httpStatus.NOT_FOUND, "No user found with this email"),
    );
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.passwordResetOTP = otp;
  user.passwordResetOTPExpiry = otpExpiry;
  user.passwordResetOTPVerified = false;
  user.password_reset_token = "";
  await user.save();

  await sendEmail({
    to: email,
    subject: "Password Reset OTP",
    html: forgotPasswordEmailTemplate(user.name, otp),
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset OTP sent to your email",
    data: null,
  });
});

export const verifyForgotPasswordOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "Email and OTP are required"),
    );
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(
      new AppError(httpStatus.NOT_FOUND, "No user found with this email"),
    );
  }

  if (!user.passwordResetOTP || user.passwordResetOTP !== otp) {
    return next(new AppError(httpStatus.BAD_REQUEST, "Invalid OTP"));
  }

  if (
    !user.passwordResetOTPExpiry ||
    new Date() > new Date(user.passwordResetOTPExpiry)
  ) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "OTP has expired. Please request a new OTP.",
      ),
    );
  }

  user.passwordResetOTPVerified = true;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP verified successfully",
    data: null,
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Email and new password are required",
      ),
    );
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(
      new AppError(httpStatus.NOT_FOUND, "No user found with this email"),
    );
  }

  if (!user.passwordResetOTPVerified) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Please verify OTP before resetting password",
      ),
    );
  }

  if (
    !user.passwordResetOTPExpiry ||
    new Date() > new Date(user.passwordResetOTPExpiry)
  ) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "OTP session expired. Please request a new OTP.",
      ),
    );
  }

  // Update password
  user.password = newPassword;
  user.passwordResetOTP = null;
  user.passwordResetOTPExpiry = null;
  user.passwordResetOTPVerified = false;
  user.password_reset_token = "";
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      "Password reset successful. You can now login with your new password.",
    data: null,
  });
});

export const logout = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Clear refresh token
  await User.findByIdAndUpdate(userId, { refreshToken: "" });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logout successful",
    data: null,
  });
});

export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  if (!currentPassword || !newPassword) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "Current password and new password are required",
      ),
    );
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "User not found",
      data: null,
    });
  }

  if (currentPassword === newPassword) {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "New password must be different from current password",
      ),
    );
  }

  // Verify current password
  const isPasswordMatch = await User.isPasswordMatched(
    currentPassword,
    user.password,
  );
  if (!isPasswordMatch) {
    return next(
      new AppError(httpStatus.UNAUTHORIZED, "Current password is incorrect"),
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
    data: null,
  });
});
