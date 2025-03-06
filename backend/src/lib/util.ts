import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV } from "../secrets";
import { Response } from "express";
import {Types} from "mongoose";

export const generateToken = (
  userId: Types.ObjectId,
  res: Response
) => {
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
