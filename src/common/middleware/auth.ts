import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../../module/user/model";

function extractToken(req: Request): string | null {
  // 1) Cookie (httpOnly recommended)
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  // 2) Authorization: Bearer <token>
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  return null;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail loudly in dev; 500 in prod
    return res
      .status(500)
      .json({ message: "Server misconfiguration: JWT_SECRET not set" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload &
      Express.UserJwtPayload;

    // Optional hardening checks (customize as needed)
    // if (!decoded.emailVerified) return res.status(403).json({ message: "Email not verified" });

    // Load user's current permissions from database to ensure they're up-to-date
    const dbUser = await User.findById(decoded.id);

    const userPermissions = dbUser?.permissions || decoded.permissions || [];

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: userPermissions,
      iat: decoded.iat,
      exp: decoded.exp,
      // Add hasPermission helper method
      hasPermission: (permission: string) => {
        return userPermissions.includes(permission);
      },
    } as any;

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Role-based authorization.
 * Usage: authorize("admin"), authorize("editor","admin")
 */
export const authorize =
  (...allowedRoles: Array<Express.UserJwtPayload["role"]>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });

    if(role === "super-admin") {
      return next(); // super-admin bypasses role checks
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    return next();
  };

/**
 * Permission-based guard (optional, for granular control).
 * Usage: requirePermissions("blog:publish","blog:edit")
 */
export const requirePermissions =
  (...required: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const perms = req.user?.permissions ?? [];
    const missing = required.filter((p) => !perms.includes(p));
    if (missing.length) {
      return res.status(403).json({
        message: "Forbidden: missing permissions",
        missing,
      });
    }
    return next();
  };

/**
 * Backwards-compatible admin-only guard (if you still need it)
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};

/**
 * Optional authentication middleware
 * Sets req.user if valid token is provided (cookie or Bearer), but doesn't block request if no token
 * Useful for routes that should work for both authenticated and unauthenticated users
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  // If no token, continue without user
  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Log error but don't block request for optional auth
    console.error("Server misconfiguration: JWT_SECRET not set");
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload &
      Express.UserJwtPayload;

    // Load user's current permissions from database to ensure they're up-to-date
    const dbUser = await User.findById(decoded.id);

    // If user not found in DB, continue without user
    if (!dbUser) {
      return next();
    }

    const userPermissions = dbUser?.permissions || decoded.permissions || [];

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: userPermissions,
      iat: decoded.iat,
      exp: decoded.exp,
      // Add hasPermission helper method
      hasPermission: (permission: string) => {
        return userPermissions.includes(permission);
      },
    } as any;

    return next();
  } catch (err) {
    // If token is invalid, just continue without user instead of blocking
    console.log("Invalid token in optional auth:", err);
    return next();
  }
};
