import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    profilePic: {
      type: String,
      default: "",
    },
    publicKey: {
      alg: String,
      e: String,
      ext: Boolean,
      key_ops: [String],
      kty: String,
      n: String
    }
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
