import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV } from "../secrets";
import { Response } from "express";
import { Types } from "mongoose";

export const generateToken = (userId: Types.ObjectId, res: Response) => {
  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: NODE_ENV !== "development",
  });

  return token;
};

export const generateUsername = (fullName: string) => {
  // Remove extra spaces and split into words
  const names = fullName.trim().toLowerCase().split(/\s+/);

  // Ensure there are at least two parts to work with
  if (names.length < 2) return names[0] + Math.floor(Math.random() * 1000);

  // Construct a username
  const firstPart = names[0]; // First name
  const secondPart = names[names.length - 1]; // Last name
  const randomNum = Math.floor(Math.random() * 1000); // Random number

  return `${firstPart}${secondPart}${randomNum}`;
};
