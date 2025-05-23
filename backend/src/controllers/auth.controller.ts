import { Request, Response } from "express";
import { ErrorCode } from "../exceptions/root";
import User from "../models/user.model";
import { BadRequestException } from "../exceptions/bad-request";
import { compareSync, genSalt, hashSync } from "bcryptjs";
import logger from "../lib/logger";
import { generateToken, generateUsername } from "../lib/util";
import { LoginSchema, SignUpSchema } from "../schema/user.schema";
import cloudinary from "../lib/cloudinary";
import Key from "../models/key.model";
import { NotFoundException } from "../exceptions/notfound-exception";

export const signup = async (req: Request, res: Response) => {
  SignUpSchema.parse(req.body);
  const { email, password, fullName } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    throw new BadRequestException(
      "User already exists",
      ErrorCode.USER_ALREADY_EXISTS
    );
  }

  const salt = await genSalt(10);
  const hashedPassword = hashSync(password, salt);

  const username = generateUsername(fullName);

  const newUser = new User({
    ...req.body,
    password: hashedPassword,
    username,
  });

  generateToken(newUser._id, res);

  await newUser.save();

  const { password: userPassword, ...safeUser } = newUser.toObject();

  res.status(201).json(logger.success("Successfully singup", safeUser));
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

  res.status(200).json(logger.success("Successfully logined", safeUser));
};

export const logout = async (req: Request, res: Response) => {
  res.cookie("token", "", { maxAge: 0 });
  res.status(200).send(logger.success("logged out successfully"));
};

export const updateProfile = async (req: Request, res: Response) => {
  const { profilePic } = req.body;
  const { _id } = req.user;

  const uploadResponse = await cloudinary.uploader.upload(profilePic);
  const updatedUser = await User.findByIdAndUpdate(
    _id,
    { profilePic: uploadResponse.secure_url },
    { new: true }
  );

  res.status(200).json(logger.success("Successfully updated", updatedUser));
};

export const checkAuth = (req: Request, res: Response) => {
  res.status(200).json(logger.success("checked auth", req.user));
};

export const saveKey = async (req: Request, res: Response) => {
  const { _id } = req.user;
  const { key } = req.body;

  if (!key) throw new BadRequestException("Key is required", ErrorCode.UNPROCESSABLEENTITY)

  const savedKey = await Key.create({
    userId: _id,
    key
  })

  res.status(201).json(logger.success("Successfully saved", savedKey))
}

export const getKey = async (req: Request, res: Response) => {
  const { _id } = req.user;

  const { key } = await Key.findOne({ userId: _id }) || {}
  if (!key) throw new NotFoundException("Key not found", ErrorCode.KEY_NOTFOUND)

  res.status(200).json(logger.success("Get key", key))
}
