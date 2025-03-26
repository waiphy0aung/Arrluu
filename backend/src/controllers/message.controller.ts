import { Request, Response } from "express";
import User from "../models/user.model";
import logger from "../lib/logger";
import Message from "../models/message.model";
import cloudinary from "../lib/cloudinary";
import { getReceiverSocketId, io } from "../lib/socket";

export const getUsersForSidebar = async (req: Request, res: Response) => {
  const { _id } = req.user;
  const filteredUsers = await User.find({ _id: { $ne: _id } });

  res.status(200).json(logger.success("Users For Sidebar", filteredUsers));
};

export const getMessages = async (req: Request, res: Response) => {
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  });

  res.status(200).json(logger.success("got messages", messages));
};

export const sendMessage = async (req: Request, res: Response) => {
  const { image } = req.body;
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;

  let imageUrl;
  if (image) {
    const uploadResponse = await cloudinary.uploader.upload(image);
    imageUrl = uploadResponse.secure_url;
  }

  const newMessage = new Message({
    senderId,
    receiverId,
    ...req.body,
    image: imageUrl,
  });

  await newMessage.save();

  const receiverSocketId = getReceiverSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }

  res.status(201).json(logger.success("Message sent", newMessage));
};
