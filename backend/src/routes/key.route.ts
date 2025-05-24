import { Router } from "express";
import { errorHandler } from "../error-handler";
import { getKey, saveKey } from "../controllers/auth.controller";
import { generalRateLimit } from "../middlewares/rateLimit.middleware";

const keyRoutes = Router();

keyRoutes.post("/", generalRateLimit, errorHandler(saveKey));
keyRoutes.get("/", generalRateLimit, errorHandler(getKey));

export default keyRoutes;
