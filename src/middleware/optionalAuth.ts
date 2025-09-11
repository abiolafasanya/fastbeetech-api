import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../module/user/model";

/**
 * Optional authentication middleware
 * Sets req.user if valid token is provided, but doesn't block request if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      (req as any).user = user;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    console.log("Invalid token in optional auth:", error);
    next();
  }
};
