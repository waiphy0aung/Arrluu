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

const authRoutes: Router = Router();

authRoutes.post("/signup", errorHandler(signup));
authRoutes.post("/login", errorHandler(login));
authRoutes.post("/logout", errorHandler(logout));

authRoutes.get("/check", authMiddleware, errorHandler(checkAuth));

authRoutes.put("/update-profile", authMiddleware, errorHandler(updateProfile));

export default authRoutes;
