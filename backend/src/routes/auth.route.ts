import { Request, Response, Router } from "express";
import {login, logout, signup} from "../controllers/auth.controller";
import {errorHandler} from "../error-handler";

const authRoutes: Router = Router();

authRoutes.post("/signup", errorHandler(signup));
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);

export default authRoutes;
