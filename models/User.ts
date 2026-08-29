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
    required: function (this: { googleId?: string | null }) {
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

  // ---- Encrypted Secrets Vault ----
  // All fields below are opaque/public and safe to store in clear. The vault
  // passphrase and derived key NEVER touch the server; these only let the
  // browser re-derive and self-verify the key. See lib/vault/crypto.ts.
  vaultEnabled: {
    type: Boolean,
    default: false,
  },
  // Per-user random salt (base64) fed into Argon2id in the browser.
  vaultSalt: {
    type: String,
    required: false,
    default: null,
  },
  // Argon2id cost parameters, stored so they can be raised later without
  // breaking vaults created under older params.
  vaultKdf: {
    opsLimit: { type: Number, required: false },
    memLimit: { type: Number, required: false },
    alg: { type: Number, required: false },
  },
  // Sealed known-constant ("vault-ok"). The browser decrypts this on unlock to
  // confirm a typed passphrase is correct — the server can neither verify nor
  // learn the passphrase from it.
  vaultVerifier: {
    nonce: { type: String, required: false },
    ciphertext: { type: String, required: false },
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

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
export const TIER_LINK_LIMITS = { free: 2, pro: 15 } as const;

// Check tier usage limits.
//
// IMPORTANT: when the quota window has elapsed this rolls the counter over
// **in memory only** — it does not save. Callers that go on to create a link
// must call recordLinkCreated(), which persists the rollover together with the
// increment. Updating the counter with a bare $inc instead would leave
// lastResetDate frozen forever, so the window would appear to have elapsed on
// every subsequent request and the limit would never actually be enforced.
UserSchema.methods.canCreateLink = function () {
  const now = new Date();
  const lastReset = this.lastResetDate
    ? new Date(this.lastResetDate).getTime()
    : 0;
  const timeDiff = now.getTime() - lastReset;

  const resetWindow = this.tier === "pro" ? DAY_MS : WEEK_MS;
  if (timeDiff >= resetWindow) {
    this.linksCreatedCount = 0;
    this.lastResetDate = now;
  }

  const maxAllowed =
    TIER_LINK_LIMITS[this.tier as keyof typeof TIER_LINK_LIMITS] || 0;

  return this.linksCreatedCount < maxAllowed;
};

// Persist "one more link used". Saves the whole document, so any window
// rollover staged by canCreateLink() lands in the same write.
UserSchema.methods.recordLinkCreated = async function () {
  this.linksCreatedCount = (this.linksCreatedCount || 0) + 1;
  await this.save();
};

export default models.User || model("User", UserSchema);
