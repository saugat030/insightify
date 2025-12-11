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
  expires: {
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
//prevent OverwriteModelError by creating new model if not exist but use the existing one if exists.
export default models.RefreshToken || model("RefreshToken", RefreshTokenSchema);
