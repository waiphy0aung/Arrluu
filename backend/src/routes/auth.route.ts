import { Router } from "express";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
} from "../controllers/auth.controller";
import { errorHandler } from "../error-handler";
import authMiddleware from "../middlewares/auth.middleware";
import { authRateLimit, generalRateLimit } from "../middlewares/rateLimit.middleware";

const authRoutes: Router = Router();

authRoutes.post("/signup", authRateLimit, errorHandler(signup));
authRoutes.post("/login", authRateLimit, errorHandler(login));
authRoutes.post("/logout", generalRateLimit, errorHandler(logout));

authRoutes.get("/check", authMiddleware, errorHandler(checkAuth));
authRoutes.put("/update-profile", authMiddleware, generalRateLimit, errorHandler(updateProfile));

export default authRoutes;
