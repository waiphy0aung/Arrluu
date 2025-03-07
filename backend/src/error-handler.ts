import { NextFunction, Request, Response } from "express";
import { ErrorCode, HttpException } from "./exceptions/root";
import { InternalException } from "./exceptions/internal-exception";
import { ZodError } from "zod";
import { UnprocessableEntity } from "./exceptions/validation";

export const errorHandler = (method: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await method(req, res, next);
    } catch (e: any) {
      console.log("Error >>", e);
      let exception: HttpException;
      if (e instanceof HttpException) {
        exception = e;
      } else {
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
