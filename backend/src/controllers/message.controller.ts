import { Request, Response } from "express";
import User from "../models/user.model";
import logger from "../lib/logger";
import Message from "../models/message.model";
import { messageQueue, queueEvents } from "../lib/queue";
import { MessageSchema } from "../schema/user.schema";
import { BadRequestException } from "../exceptions/bad-request";
import { ErrorCode } from "../exceptions/root";

export const getUsersForSidebar = async (req: Request, res: Response) => {
  const { _id } = req.user;
  
  // Only return necessary fields and limit results
  const filteredUsers = await User.find(
    { _id: { $ne: _id } },
    { password: 0 } // Exclude password field
  )
  .limit(50) // Limit to 50 users
  .sort({ createdAt: -1 });

  res.status(200).json(logger.success("Users retrieved successfully", filteredUsers));
};

export const getMessages = async (req: Request, res: Response) => {
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;
  
  // Pagination support
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  if (!receiverId) {
    throw new BadRequestException("Receiver ID is required", ErrorCode.UNPROCESSABLEENTITY);
  }

  const messages = await Message.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .lean(); // Use lean() for better performance

  // Reverse to get chronological order
  messages.reverse();

  res.status(200).json(logger.success("Messages retrieved successfully", messages));
};

export const sendMessage = async (req: Request, res: Response) => {
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;

  if (!receiverId) {
    throw new BadRequestException("Receiver ID is required", ErrorCode.UNPROCESSABLEENTITY);
  }

  // Validate receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new BadRequestException("Receiver not found", ErrorCode.USER_NOTFOUND);
  }

  const validatedData = MessageSchema.parse(req.body);

  const job = await messageQueue.add("sendMessage", {
    senderId,
    receiverId,
    body: validatedData
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    }
  });

  const newMessage = await job.waitUntilFinished(queueEvents);

  res.status(201).json(logger.success("Message sent successfully", newMessage));
};
