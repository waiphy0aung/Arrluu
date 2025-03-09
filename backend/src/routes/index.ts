import { Router } from "express";
import authRoutes from "./auth.route";
import messageRoutes from "./message.route";
import authMiddleware from "../middlewares/auth.middleware";

const routes: Router = Router();

routes.use("/auth",authRoutes)

routes.use("/messages", authMiddleware, messageRoutes)

export default routes
