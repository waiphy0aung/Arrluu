import { Router } from "express";
import { errorHandler } from "../error-handler";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller";

const messageRoutes = Router();

messageRoutes.get("/users", errorHandler(getUsersForSidebar));

messageRoutes.get("/:id", errorHandler(getMessages));

messageRoutes.post("/send/:id", errorHandler(sendMessage));

export default messageRoutes;
