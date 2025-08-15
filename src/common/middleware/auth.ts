import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

function extractToken(req: Request): string | null {
  // 1) Cookie (httpOnly recommended)
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  // 2) Authorization: Bearer <token>
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  return null;
}

export const authenticate = (
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

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions ?? [],
      iat: decoded.iat,
      exp: decoded.exp,
    };

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
