import winston from "winston";
import { NODE_ENV } from "../secrets";

// Create winston logger
const winstonLogger = winston.createLogger({
  level: NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "chat-app-backend" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (NODE_ENV !== "production") {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

const generateLog: GenerateLog = (status, message, data, detail, errorCode) => {
  const logData = {
    status,
    message,
    data,
    detail: detail instanceof Error ? detail.message : detail,
    errorCode,
    timestamp: new Date().toISOString()
  };

  if (status === "success") {
    console.log(`\x1b[32m✔ ${message}\x1b[0m`);
    winstonLogger.info(logData);
    return { status, message, data };
  } else {
    console.log(`\x1b[31mX ${message}\x1b[0m\n\x1b[36m! ${detail}\x1b[0m`);
    winstonLogger.error(logData);
    return { status, message, detail: detail instanceof Error ? detail.message : detail, errorCode };
  }
};

const logger: Logger = {
  success(message, data = null) {
    return generateLog("success", message, data);
  },
  error(message, detail, errorCode) {
    return generateLog("error", message, null, detail, errorCode);
  },
  // Add additional logging methods
  warn(message, data = null) {
    winstonLogger.warn({ message, data, timestamp: new Date().toISOString() });
    console.log(`\x1b[33m⚠ ${message}\x1b[0m`);
  },
  info(message, data = null) {
    winstonLogger.info({ message, data, timestamp: new Date().toISOString() });
    console.log(`\x1b[34mℹ ${message}\x1b[0m`);
  }
};

export default logger;

// Keep existing types
type ResponseData = {
  status: "success" | "error" | "fail";
  message: string;
  detail?: string | { [x: string]: any };
  data?: any;
  errorCode?: number;
};

type GenerateLog = (
  status: ResponseData["status"],
  message: ResponseData["message"],
  data?: any,
  detail?: ResponseData["detail"],
  errorCode?: ResponseData["errorCode"]
) => ResponseData;

type SuccessLogger = (message: string, data?: any) => ResponseData;
type ErrorLogger = (
  message: string,
  detail?: ResponseData["detail"],
  errorCode?: ResponseData["errorCode"]
) => ResponseData;

type Logger = {
  success: SuccessLogger;
  error: ErrorLogger;
  warn: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
};
