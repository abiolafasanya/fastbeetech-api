import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // const token = req.headers.authorization?.split(" ")[1];
  // console.log("Request Cookies",req.cookies);
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};
