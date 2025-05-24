import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 30
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 128,
      select: false
    },
    profilePic: {
      type: String,
      default: "",
      maxlength: 500
    },
    publicKey: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        return ret;
      }
    }
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);
export default User;
