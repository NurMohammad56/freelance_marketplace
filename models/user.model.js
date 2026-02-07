import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "client", "creative"],
      required: true,
      index: true,
    },

    name: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationOTP: {
      type: String,
      default: null,
    },

    emailVerificationOTPExpiry: {
      type: Date,
      default: null,
    },

    accountStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "approved",
      index: true,
    },

    // Creative works (for portfolio)
    works: [
      {
        title: {
          type: String,
          trim: true,
          required: true,
        },
        images: [
          {
            public_id: {
              type: String,
              required: true,
            },
            url: {
              type: String,
              required: true,
            },
          },
        ],
      },
    ],

    // Client featured projects
    projects: [
      {
        title: {
          type: String,
          default: "",
        },
        images: [
          {
            public_id: {
              type: String,
              required: true,
            },
            url: {
              type: String,
              required: true,
            },
          },
        ],
        videos: [
          {
            public_id: {
              type: String,
              required: true,
            },
            url: {
              type: String,
              required: true,
            },
          },
        ],
      },
    ],

    locationGeo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    interests: [
      {
        type: String,
        default: "",
      },
    ],

    profileImage: {
      public_id: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },

    bio: {
      type: String,
      default: "",
    },

    specialRole: {
      type: String,
      default: "",
    },

    // Blue badge verification status for creatives
    isVerified: {
      type: Boolean,
      default: false,
    },

    password_reset_token: {
      type: String,
      default: "",
    },

    refreshToken: {
      type: String,
      default: "",
    },

    // Track user preferences
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      chatNotifications: {
        type: Boolean,
        default: true,
      },
    },

    // Account deletion flag
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    const saltRounds = Number(process.env.bcrypt_salt_round) || 10;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
  next();
});

// Static method to check if user exists by email
userSchema.statics.isUserExistsByEmail = async function (email) {
  return await User.findOne({ email }).select("+password");
};

// Static method to check if OTP is verified
userSchema.statics.isOTPVerified = async function (id) {
  const user = await User.findById(id);
  return user?.isEmailVerified;
};

// Static method to check if password matches
userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashPassword,
) {
  return await bcrypt.compare(plainTextPassword, hashPassword);
};

// Create geospatial index
userSchema.index({ locationGeo: "2dsphere" });

// Create text index for works title
userSchema.index({ "works.title": 1 });

export const User = mongoose.model("User", userSchema);
