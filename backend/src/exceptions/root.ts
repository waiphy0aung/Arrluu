export class HttpException extends Error {
  message: string;
  errorCode: ErrorCode;
  statusCode: number;
  errors: any;

  constructor(
    message: string,
    errorCode: ErrorCode,
    statusCode: number,
    error?: any
  ) {
    super(message);
    this.message = message;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.errors = error;
  }
}

export enum ErrorCode {
  USER_ALREADY_EXISTS = 1001,
  INCORRECT_CREDENTIALS = 1002,
  PRODUCT_NOTFOUND = 1003,
  USER_NOTFOUND = 1004,
  ADDRESS_NOTFOUND = 1005,
  KEY_NOTFOUND = 1006,
  UNPROCESSABLEENTITY = 2001,
  INTERNAL_EXCEPTION = 3001,
  UNAUTHORIZED = 4001
}
