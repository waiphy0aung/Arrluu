import { Request, Response } from "express";
import { ErrorCode } from "../exceptions/root";
import User from "../models/user.model";
import { BadRequestException } from "../exceptions/bad-request";
import { compareSync, genSalt, hashSync } from "bcryptjs";
import logger from "../lib/logger";
import { generateToken, generateUsername, sanitizeInput } from "../lib/util";
import { LoginSchema, SignUpSchema, UpdateProfileSchema, SaveKeySchema } from "../schema/user.schema";
import cloudinary from "../lib/cloudinary";
import Key from "../models/key.model";
import { NotFoundException } from "../exceptions/notfound-exception";

export const signup = async (req: Request, res: Response) => {
  const validatedData = SignUpSchema.parse(req.body);
  const { email, password, fullName, publicKey } = validatedData;

  // Sanitize inputs
  const sanitizedEmail = sanitizeInput(email.toLowerCase());
  const sanitizedFullName = sanitizeInput(fullName);

  const existingUser = await User.findOne({ email: sanitizedEmail });
  if (existingUser) {
    throw new BadRequestException(
      "User already exists",
      ErrorCode.USER_ALREADY_EXISTS
    );
  }

  const salt = await genSalt(12); // Increased from 10 to 12
  const hashedPassword = hashSync(password, salt);
  const username = generateUsername(sanitizedFullName);

  const newUser = new User({
    email: sanitizedEmail,
    fullName: sanitizedFullName,
    password: hashedPassword,
    username,
    publicKey,
  });

  await newUser.save();
  generateToken(newUser._id, res);

  const { password: userPassword, ...safeUser } = newUser.toObject();
  res.status(201).json(logger.success("Successfully signed up", safeUser));
};

export const login = async (req: Request, res: Response) => {
  const validatedData = LoginSchema.parse(req.body);
  const { email, password } = validatedData;

  const sanitizedEmail = sanitizeInput(email.toLowerCase());
  const user = await User.findOne({ email: sanitizedEmail }).select("+password");

  if (!user || !compareSync(password, user.password as string)) {
    throw new BadRequestException(
      "Incorrect credentials",
      ErrorCode.INCORRECT_CREDENTIALS
    );
  }

  generateToken(user._id, res);
  const { password: userPassword, ...safeUser } = user.toObject();

  res.status(200).json(logger.success("Successfully logged in", safeUser));
};

export const logout = async (req: Request, res: Response) => {
  res.cookie("token", "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  });
  res.status(200).json(logger.success("Logged out successfully"));
};

export const updateProfile = async (req: Request, res: Response) => {
  const validatedData = UpdateProfileSchema.parse(req.body);
  const { profilePic } = validatedData;
  const { _id } = req.user;

  if (!profilePic) {
    throw new BadRequestException("Profile picture is required", ErrorCode.UNPROCESSABLEENTITY);
  }

  const uploadResponse = await cloudinary.uploader.upload(profilePic, {
    folder: 'chat-app/profiles',
    transformation: [
      { width: 400, height: 400, crop: 'fill' },
      { quality: 'auto:good' }
    ]
  });

  const updatedUser = await User.findByIdAndUpdate(
    _id,
    { profilePic: uploadResponse.secure_url },
    { new: true, select: '-password' }
  );

  res.status(200).json(logger.success("Profile updated successfully", updatedUser));
};

export const checkAuth = (req: Request, res: Response) => {
  const { password, ...safeUser } = req.user.toObject();
  res.status(200).json(logger.success("Checked auth", safeUser));
};

export const saveKey = async (req: Request, res: Response) => {
  const validatedData = SaveKeySchema.parse(req.body);
  const { _id } = req.user;
  const { key } = validatedData;

  // Check if user already has a key
  const existingKey = await Key.findOne({ userId: _id });
  if (existingKey) {
    throw new BadRequestException("Key already exists for this user", ErrorCode.UNPROCESSABLEENTITY);
  }

  const savedKey = await Key.create({
    userId: _id,
    key,
    encryptionAlgorithm: 'AES-GCM' // Fixed typo from original
  });

  const { key: _, ...safeKey } = savedKey.toObject();
  res.status(201).json(logger.success("Key saved successfully", safeKey));
};

export const getKey = async (req: Request, res: Response) => {
  const { _id } = req.user;

  const keyDoc = await Key.findOne({ userId: _id });
  if (!keyDoc) {
    throw new NotFoundException("Key not found", ErrorCode.KEY_NOTFOUND);
  }

  res.status(200).json(logger.success("Get key", keyDoc.key));
};
