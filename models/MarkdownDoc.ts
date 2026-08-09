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
  // For plaintext docs this holds the raw markdown. For encrypted docs it holds
  // the base64 XSalsa20-Poly1305 ciphertext produced in the browser; the server
  // never sees the plaintext or the key.
  content: {
    type: String,
    default: "",
  },
  // When true, `content` is ciphertext and `nonce` is its base64 24-byte nonce.
  encrypted: {
    type: Boolean,
    default: false,
  },
  nonce: {
    type: String,
    required: false,
    default: null,
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
