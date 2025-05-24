import { Router } from "express";
import { errorHandler } from "../error-handler";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller";
import { messageRateLimit, generalRateLimit } from "../middlewares/rateLimit.middleware";

const messageRoutes = Router();

messageRoutes.get("/users", generalRateLimit, errorHandler(getUsersForSidebar));
messageRoutes.get("/:id", generalRateLimit, errorHandler(getMessages));
messageRoutes.post("/send/:id", messageRateLimit, errorHandler(sendMessage));

export default messageRoutes;
