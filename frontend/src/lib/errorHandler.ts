import axios, { AxiosError } from "axios";
import { Message } from "../types/message.types";
import { ApiError } from "../types/api.types";

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class CryptoError extends AppError {
  constructor(message: string) {
    super(`Crypto operation failed: ${message}`, 'CRYPTO_ERROR');
    this.name = 'CryptoError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode);
    this.name = 'NetworkError';
  }
}

export function isApiError(error: unknown): error is AxiosError<ApiError> {
  return axios.isAxiosError(error);
}

export function isCryptoKey(key: unknown): key is CryptoKey {
  return key instanceof CryptoKey;
}

export function isValidMessage(data: unknown): data is Message {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_id' in data &&
    'senderId' in data &&
    'receiverId' in data &&
    'text' in data
  );
}
