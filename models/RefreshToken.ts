// models/RefreshToken.ts
import { Schema, models, model } from "mongoose";

const RefreshTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  jti: {
    type: String,
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

// Index for cleanup tasks (This one is correct and should stay)
RefreshTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export default models.RefreshToken || model("RefreshToken", RefreshTokenSchema);
