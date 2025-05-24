import { NextFunction, Request, Response } from "express";
import { ErrorCode, HttpException } from "./exceptions/root";
import { InternalException } from "./exceptions/internal-exception";
import { ZodError } from "zod";
import { UnprocessableEntity } from "./exceptions/validation";
import logger from "./lib/logger";

export const errorHandler = (method: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await method(req, res, next);
    } catch (e: any) {
      let exception: HttpException;
      if (e instanceof HttpException) {
        exception = e;
      } else {
        logger.error('Request failed', {
          error: e.message,
          stack: e.stack,
          url: req.url,
          method: req.method,
          userId: req.user?._id,
          ip: req.ip
        });
        if (e instanceof ZodError) {
          exception = new UnprocessableEntity(
            "Unprocessable Entity!",
            ErrorCode.UNPROCESSABLEENTITY,
            e.issues
          );
        } else {
          exception = new InternalException(
            "Something went wrong!",
            e,
            ErrorCode.INTERNAL_EXCEPTION
          );
        }
      }
      next(exception);
    }
  };
};
