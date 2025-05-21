import { Queue, QueueEvents, Worker } from "bullmq";
import cloudinary from "./cloudinary";
import Message from "../models/message.model";
import { getReceiverSocketId, io } from "./socket";
import redisConnection from "./redis";

export const messageQueue = new Queue("messageQueue", { connection: redisConnection });

export const queueEvents = new QueueEvents("messageQueue", { connection: redisConnection });

export const messageWorker = new Worker(
  "messageQueue",
  async (job) => {
    const { senderId, receiverId, body } = job.data;
    const { image } = body

    let imageUrl = null;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      ...body,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    console.log("receiverSocketId", receiverSocketId)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    return newMessage;
  },
  { connection: redisConnection }
);

messageWorker.on("completed", (job) => {
  console.log(`Message job ${job.id} completed`);
});

messageWorker.on("failed", (job, err) => {
  console.error(`Message job ${job?.id} failed`, err);
});
