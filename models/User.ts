import { Schema, models, model } from "mongoose";
import bcrypt from "bcryptjs";
//Object-Oriented way (logic encapsulated in the data model) method. This makes the model heavy but the controller small.
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
  password: {
    type: String,
    required: [true, "Password is required."],
    select: false, // prevent password from being returned by default in queries. there is a way to explicitly ask for it. Do chatgpt to know more.
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// middleware to hash password before saving
//pre('save') is a Mongoose Hook. It runs immediately before the document is written to MongoDB.
//this refers to the current object i.e the current document.
//esma if we try to use arrow function, the code breaks. Chatgpt for more details.
UserSchema.pre("save", async function (next) {
  // only hash the password if it has been modified (or is new)
  // if a user updates their email or username, we dont want to re-hash their already hashed password (that would break their login).
  if (!this.isModified("password")) {
    return next();
  }

  // password hash
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// this attaches a .comparePassword method in the model itself so that we dont have to import bcrypt and do it there.
//usage: const isMatch = await user.comparePassword(inputPassword);
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  // 'this.password' is accessible here because we'll explicitly select it
  return await bcrypt.compare(candidatePassword, this.password);
};

export default models.User || model("User", UserSchema);
