import { NextFunction, Request, Response } from "express";
import { HttpException } from "../exceptions/root";
import logger from "../lib/logger";

export const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode, message } = error;
  res.status(statusCode).json(logger.error(message, error.errors, statusCode));
};
