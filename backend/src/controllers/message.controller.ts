import { Request, Response } from "express";
import User from "../models/user.model";
import logger from "../lib/logger";
import Message from "../models/message.model";
import { messageQueueManager } from "../lib/queue";
import { MessageSchema } from "../schema/user.schema";
import { BadRequestException } from "../exceptions/bad-request";
import { ErrorCode } from "../exceptions/root";
import { isValidObjectId } from "../lib/util";

export const getUsersForSidebar = async (req: Request, res: Response) => {
  const { _id } = req.user;

  const filteredUsers = await User.find(
    { _id: { $ne: _id } },
    { password: 0 }
  )
    .limit(50)
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(logger.success("Users retrieved successfully", filteredUsers));
};

export const getMessages = async (req: Request, res: Response) => {
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;

  // Validation
  if (!receiverId || !isValidObjectId(receiverId)) {
    throw new BadRequestException("Valid receiver ID is required", ErrorCode.UNPROCESSABLEENTITY);
  }

  // Pagination with reasonable defaults
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const skip = (page - 1) * limit;

  const messages = await Message.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  // Reverse for chronological order
  messages.reverse();

  // res.status(200).json(logger.success("Messages retrieved successfully", {
  //   messages,
  //   pagination: {
  //     page,
  //     limit,
  //     total: messages.length,
  //     hasMore: messages.length === limit
  //   }
  // }));
  res.status(200).json(logger.success("Messages retrived successfully", messages))
};

export const sendMessage = async (req: Request, res: Response) => {
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;

  // Validation
  if (!receiverId || !isValidObjectId(receiverId)) {
    throw new BadRequestException("Valid receiver ID is required", ErrorCode.UNPROCESSABLEENTITY);
  }

  if (senderId.toString() === receiverId) {
    throw new BadRequestException("Cannot send message to yourself", ErrorCode.UNPROCESSABLEENTITY);
  }

  // Verify receiver exists
  const receiverExists = await User.exists({ _id: receiverId });
  if (!receiverExists) {
    throw new BadRequestException("Receiver not found", ErrorCode.USER_NOTFOUND);
  }

  // Validate message data
  const validatedData = MessageSchema.parse(req.body);

  try {
    // Add job to queue
    const job = await messageQueueManager.addMessage({
      senderId: senderId.toString(),
      receiverId,
      body: validatedData
    });

    // Wait for completion with timeout
    const newMessage = await Promise.race([
      messageQueueManager.waitForCompletion(job),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message processing timeout')), 30000)
      )
    ]);

    res.status(201).json(logger.success("Message sent successfully", newMessage));
  } catch (error) {
    logger.error('Message sending failed', {
      senderId: senderId.toString(),
      receiverId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new BadRequestException(
      "Failed to send message. Please try again.",
      ErrorCode.INTERNAL_EXCEPTION
    );
  }
};
