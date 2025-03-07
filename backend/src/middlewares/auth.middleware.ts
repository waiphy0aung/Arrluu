import {NextFunction, Request, Response} from "express"
import jwt from "jsonwebtoken"
import {UnauthorizedException} from "../exceptions/unauthorized-exception"
import {ErrorCode} from "../exceptions/root"
import {JWT_SECRET} from "../secrets"
import User from "../models/user.model"

const authMiddleware = async (req: Request,res: Response, next: NextFunction) => {
  try{
    const token = req.cookies.token

    if(!token) throw Error()

    const payload = jwt.verify(token, JWT_SECRET) as any

    const user = await User.findById(payload.userId)

    if(!user) throw Error()

    req.user = user

    next()
  }catch(err){
    next(new UnauthorizedException("Unauthroized User",ErrorCode.UNAUTHORIZED))
  }
}

export default authMiddleware
