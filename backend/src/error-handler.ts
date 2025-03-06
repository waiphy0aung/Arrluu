import { NextFunction, Request, Response } from "express";
import { ErrorCode, HttpException } from "./exceptions/root";
import { InternalException } from "./exceptions/internal-exception";

export const errorHandler = (method: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await method(req, res, next);
    } catch (e: any) {
      console.log("Error >>",e)
      let exception: HttpException;
      if (e instanceof HttpException) {
        exception = e;
      } else {
        exception = new InternalException(
          "Something went wrong!",
          e,
          ErrorCode.INTERNAL_EXCEPTION
        );
      }
      next(exception);
    }
  };
};
