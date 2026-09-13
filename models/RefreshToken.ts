import { Schema, models, model } from "mongoose";

const RefreshTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  //jwt token ko id. Refer the docs in your drive for more clear answer
  //This is a unique identifier for the token itself. It is critical for security. if you need to revoke (ban) a specific token before it expires (e.g., if a user logs out or is hacked), you target it by its jti.
  jti: {
    type: String,
    required: true,
    unique: true,
  },
  // Every rotation of one login shares a family, so detected theft can revoke
  // exactly that lineage. See docs/AUTH-FIX.md §6.
  family: {
    type: String,
    required: true,
  },
  // null = live. Set = already rotated away; presenting it again is reuse.
  usedAt: {
    type: Date,
    default: null,
  },
  replacedBy: {
    type: String,
    default: null,
  },
  expires: {
    type: Date,
    required: true,
  },
  // Hard cap on the whole family. Copied forward by rotation, never extended,
  // so "30 days" cannot slide into forever.
  absoluteExpiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL ko index for cleaning up expired tokens. delete this 0 seconds after the time specified in the expires field. Donot need to write a cron job ormanual scripts to delete the token mongo handles automatically.
RefreshTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ family: 1 });
//prevent OverwriteModelError by creating new model if not exist but use the existing one if exists.
export default models.RefreshToken || model("RefreshToken", RefreshTokenSchema);
