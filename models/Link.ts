// models/Link.ts
import { Schema, models, model } from "mongoose";

const LinkSchema = new Schema({
  // Reference to the User who owns this link
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String, // This is optional
  },
  aiSummary: {
    type: [String], // An array of bullet points
    default: [],
  },
  aiTags: {
    type: [String], // An array of keywords
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index the user field for fast querying of a user's links
LinkSchema.index({ user: 1 });

export default models.Link || model("Link", LinkSchema);
