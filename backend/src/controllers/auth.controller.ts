import {Request, Response} from "express";

export const signup = async (req: Request, res: Response) => {
  res.send("signup")
}

export const login = async (req: Request, res: Response) => {
  res.send("login")
}

export const logout = async (req: Request, res: Response) => {
  res.send("logout")
}
