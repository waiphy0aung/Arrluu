import rateLimit from "express-rate-limit";
import { Request } from "express";

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    status: "error",
    message: "Too many requests, please try again later",
    errorCode: 4029
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiting (stricter)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: {
    status: "error", 
    message: "Too many authentication attempts, please try again later",
    errorCode: 4029
  }
});

// Message rate limiting
export const messageRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  keyGenerator: (req: Request) => {
    return `${req.ip}-${req.user?._id}`;
  },
  message: {
    status: "error",
    message: "Too many messages sent, please slow down",
    errorCode: 4029
  }
});
