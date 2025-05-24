import { Router } from "express";
import authRoutes from "./auth.route";
import messageRoutes from "./message.route";
import authMiddleware from "../middlewares/auth.middleware";
import keyRoutes from "./key.route";
import healthRoutes from "./health.route";

const routes: Router = Router();

routes.use("/auth", authRoutes)

routes.use("/messages", authMiddleware, messageRoutes)

routes.use("/key", authMiddleware, keyRoutes)

routes.use("/health", healthRoutes)

export default routes
