import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV } from "../secrets";
import { Response } from "express";
import { Types } from "mongoose";
import crypto from "crypto";

export const generateToken = (userId: Types.ObjectId, res: Response) => {
  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure: NODE_ENV === "production",
    path: '/'
  });

  return token;
};

export const generateUsername = (fullName: string): string => {
  const names = fullName.trim().toLowerCase().split(/\s+/);

  if (names.length < 2) {
    return names[0] + crypto.randomInt(1000, 9999);
  }

  const firstPart = names[0];
  const secondPart = names[names.length - 1];
  const randomNum = crypto.randomInt(1000, 9999);

  return `${firstPart}${secondPart}${randomNum}`;
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .substring(0, 1000); // Limit length
};

// Input validation helpers
export const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
