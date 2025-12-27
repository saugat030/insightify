import { Schema, models, model } from "mongoose";

const LinkSchema = new Schema({
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
    type: String, // optional
  },
  aiSummary: {
    type: [String], // array of bullet points
    default: [],
  },
  aiTags: {
    type: [String], // array of keywords
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

LinkSchema.index({ user: 1 });

export default models.Link || model("Link", LinkSchema);
