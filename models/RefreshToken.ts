// models/RefreshToken.ts
import { Schema, models, model } from "mongoose";

const RefreshTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  jti: {
    type: String, // The JWT ID
    required: true,
    unique: true,
  },
  expires: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index the jti for fast lookups
RefreshTokenSchema.index({ jti: 1 });
// Index for cleanup tasks
RefreshTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export default models.RefreshToken || model("RefreshToken", RefreshTokenSchema);
