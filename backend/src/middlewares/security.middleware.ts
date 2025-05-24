import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { NODE_ENV } from "../secrets";

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: NODE_ENV === "production" ? undefined : false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request size limiter
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = 50 * 1024 * 1024; // 50MB limit
  
  if (req.headers['content-length']) {
    const size = parseInt(req.headers['content-length']);
    if (size > maxSize) {
      return res.status(413).json({
        status: "error",
        message: "Request entity too large",
        errorCode: 4013
      });
    }
  }
  
  next();
};

// IP whitelist middleware (for production)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (NODE_ENV !== "production") return next();
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.includes(clientIP!)) {
      next();
    } else {
      res.status(403).json({
        status: "error",
        message: "Access denied from this IP",
        errorCode: 4003
      });
    }
  };
};
