import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedException } from "../exceptions/unauthorized-exception";
import { ErrorCode } from "../exceptions/root";
import { JWT_SECRET } from "../secrets";
import User from "../models/user.model";
import { isValidObjectId } from "../lib/util";

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      throw new UnauthorizedException("Access token required", ErrorCode.UNAUTHORIZED);
    }

    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

    if (!payload.userId || !isValidObjectId(payload.userId)) {
      throw new UnauthorizedException("Invalid token payload", ErrorCode.UNAUTHORIZED);
    }

    const user = await User.findById(payload.userId).select('-password');

    if (!user) {
      throw new UnauthorizedException("User not found", ErrorCode.UNAUTHORIZED);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedException("Invalid token", ErrorCode.UNAUTHORIZED));
    } else {
      next(err);
    }
  }
};

export default authMiddleware;
