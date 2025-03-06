import { ErrorCode, HttpException } from "./root";

export class InternalException extends HttpException {
  constructor(
    message: string,
    errors: any,
    errorCode: ErrorCode.INTERNAL_EXCEPTION
  ) {
    super(message, errorCode, 500, errors);
  }
}
