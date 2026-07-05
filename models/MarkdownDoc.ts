import { Schema, models, model } from "mongoose";

const MarkdownDocSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

MarkdownDocSchema.index({ user: 1, updatedAt: -1 });

export default models.MarkdownDoc || model("MarkdownDoc", MarkdownDocSchema);
