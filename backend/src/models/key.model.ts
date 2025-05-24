import mongoose from "mongoose";

const keySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true
  },
  key: {
    type: String,
    required: true,
    maxlength: 5000
  },
  encryptionAlgorithm: {
    type: String,
    default: 'AES-GCM',
    enum: ['AES-GCM', 'AES-CBC']
  }
}, {
  timestamps: true
});

const Key = mongoose.model("Key", keySchema);
export default Key;
