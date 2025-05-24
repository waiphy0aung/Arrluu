import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    text: {
      type: String,
      maxlength: 1000
    },
    image: {
      type: String,
      maxlength: 500
    },
    iv: {
      type: String,
      required: true,
      maxlength: 100
    },
    receiverEncryptedKey: {
      type: String,
      required: true,
      maxlength: 1000
    },
    senderEncryptedKey: {
      type: String,
      required: true,
      maxlength: 1000
    }
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
