import { Schema, models, model } from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new Schema({
  username: {
    type: String,
    required: [true, "Username is required."],
    trim: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  tier: {
    type: String,
    enum: ["free", "pro"],
    default: "free",
    required: false,
  },
  linksCreatedCount: { type: Number, default: 0 },
  lastResetDate: {
    type: Date,
    default: Date.now,
  },
  profilePicture: {
    type: String,
    required: false,
    default: null,
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required."],
    lowercase: true,
    trim: true,
  },
  // 1. CHANGED: Password is no longer strictly required for Google users
  password: {
    type: String,
    required: function (this: any) {
      // Password is only required if the user isn't using Google
      return !this.googleId;
    },
    select: false, 
  },
  // 2. ADDED: To track their federated identity from Google
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Crucial! Allows normal password users to have null/missing googleId without breaking the unique constraint
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to hash password before saving
UserSchema.pre("save", async function (next) {
  // 3. CHANGED: Guard against Google sign-ups that don't pass a password
  if (!this.password) {
    return next();
  }

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  // Password hash
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Attaches a .comparePassword method in the model itself
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  // Safety check in case a Google-only user tries to use password login
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check tier usage limits
UserSchema.methods.canCreateLink = function () {
  const now = new Date();
  const timeDiff = now.getTime() - this.lastResetDate.getTime();

  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * DAY_MS;
  
  const resetWindow = this.tier === "pro" ? DAY_MS : WEEK_MS;
  if (timeDiff >= resetWindow) {
    this.linksCreatedCount = 0;
    this.lastResetDate = now;
  }
  
  const limits = { free: 2, pro: 15 };
  const maxAllowed = limits[this.tier as "free" | "pro"] || 0;

  return this.linksCreatedCount < maxAllowed;
};

export default models.User || model("User", UserSchema);
