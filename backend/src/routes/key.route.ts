import { Router } from "express"
import { errorHandler } from "../error-handler"
import { getKey, saveKey } from "../controllers/auth.controller"

const keyRoutes = Router()

keyRoutes.post("/", errorHandler(saveKey))
keyRoutes.get("/", errorHandler(getKey))

export default keyRoutes
