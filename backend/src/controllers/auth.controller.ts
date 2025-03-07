import { Request, Response } from "express";
import { ErrorCode } from "../exceptions/root";
import User from "../models/user.model";
import { BadRequestException } from "../exceptions/bad-request";
import { compareSync, genSalt, hashSync } from "bcryptjs";
import logger from "../lib/logger";
import { generateToken } from "../lib/util";
import { LoginSchema, SignUpSchema } from "../schema/user.schema";

export const signup = async (req: Request, res: Response) => {
  SignUpSchema.parse(req.body);
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    throw new BadRequestException(
      "User already exists",
      ErrorCode.USER_ALREADY_EXISTS
    );
  }

  const salt = await genSalt(10);
  const hashedPassword = hashSync(password, salt);

  const newUser = new User({
    ...req.body,
    password: hashedPassword,
  });

  generateToken(newUser._id, res);

  await newUser.save();

  const { password: userPassword, ...safeUser } = newUser.toObject();

  res.status(201).send(logger.success("Successfully singup", safeUser));
};

export const login = async (req: Request, res: Response) => {
  LoginSchema.parse(req.body);
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !compareSync(password, user.password)) {
    throw new BadRequestException(
      "Incorrect credentials",
      ErrorCode.INCORRECT_CREDENTIALS
    );
  }

  generateToken(user._id, res);
  const { password: userPassword, ...safeUser } = user.toObject();

  res.status(200).send(logger.success("Successfully logined", safeUser));
};

export const logout = async (req: Request, res: Response) => {
  res.cookie("token", "", {maxAge: 0})
  res.status(200).send(logger.success("Successfully logged out"))
};
