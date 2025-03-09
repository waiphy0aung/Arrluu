import { NextFunction, Request, Response } from "express";
import { HttpException } from "../exceptions/root";
import logger from "../lib/logger";

export const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("Err >>",error)
  const { statusCode, errorCode, message } = error;
  res.status(statusCode).json(logger.error(message, error.errors, errorCode));
};
