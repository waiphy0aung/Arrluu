import { Request, Response } from "express";
import { UnprocessableEntity } from "../exceptions/validation";
import { ErrorCode } from "../exceptions/root";
import User from "../models/user.model";
import { BadRequestException } from "../exceptions/bad-request";
import bcrypt from "bcryptjs";
import logger from "../lib/logger";
import { generateToken } from "../lib/util";

export const signup = async (req: Request, res: Response) => {
  const { fullName, email, username, password } = req.body;

  if (!password || password.length < 6) {
    throw new UnprocessableEntity(
      "Password must be at least 6 characters",
      ErrorCode.UNPROCESSABLEENTITY
    );
  }

  const user = await User.findOne({ email });
  if (user)
    throw new BadRequestException(
      "User already exists",
      ErrorCode.USER_ALREADY_EXISTS
    );

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const newUser = new User({
    fullName,
    email,
    username,
    password: hashedPassword,
  });

  generateToken(newUser._id, res);

  await newUser.save();

  const {password: userPassword, ...safeUser} = newUser.toObject()

  res.status(201).send(logger.success("Successfully singup", safeUser));
};

export const login = async (req: Request, res: Response) => {
  res.send("login");
};

export const logout = async (req: Request, res: Response) => {
  res.send("logout");
};
