import { Request, Response, NextFunction } from "express";
import { Permission, UserRole } from "../config/roles-permissions";

// Extend the existing Express user interface
interface AuthenticatedRequest extends Request {
  user: Express.UserJwtPayload & {
    permissions: string[];
    hasPermission: (permission: Permission) => boolean;
  };
}

/**
 * Middleware to check if authenticated user has required permission
 * Should be used after authenticate middleware
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({
        status: false,
        message: "Authentication required",
      });
    }

    if (!authReq.user.hasPermission(permission)) {
      return res.status(403).json({
        status: false,
        message: "Insufficient permissions",
        required: permission,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has ANY of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({
        status: false,
        message: "Authentication required",
      });
    }

    const hasAnyPermission = permissions.some((permission) =>
      authReq.user.hasPermission(permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        status: false,
        message: "Insufficient permissions",
        requiredAny: permissions,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has ALL of the specified permissions
 */
export function requireAllPermissions(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({
        status: false,
        message: "Authentication required",
      });
    }

    const hasAllPermissions = permissions.every((permission) =>
      authReq.user.hasPermission(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        status: false,
        message: "Insufficient permissions",
        requiredAll: permissions,
      });
    }

    next();
  };
}

/**
 * Helper function to check permissions in controllers
 */
export function checkPermission(user: any, permission: Permission): boolean {
  return user?.hasPermission?.(permission) || false;
}

/**
 * Helper function to check multiple permissions in controllers
 */
export function checkAnyPermission(
  user: any,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => checkPermission(user, permission));
}

export default requirePermission;
