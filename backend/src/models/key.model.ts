import mongoose from "mongoose"

const keySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  encryptionAlgoritim: {
    type: String,
    default: 'AES-GCM'
  }
}, {
  timestamps: true
})

const Key = mongoose.model("Key", keySchema)

export default Key
