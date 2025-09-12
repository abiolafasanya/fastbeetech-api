import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../../module/user/model";
import {
  UserRole,
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canManageUser,
  canManageResource,
} from "../config/roles-permissions";

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
    return res
      .status(500)
      .json({ message: "Server misconfiguration: JWT_SECRET not set" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload &
      Express.UserJwtPayload;

    // Load latest role/permissions from DB to avoid stale JWT data
    const dbUser = await User.findById(decoded.id).select("role permissions");

    const effectivePermissions =
      dbUser?.permissions ?? decoded.permissions ?? [];
    const effectiveRole = (dbUser?.role as any) ?? decoded.role;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: effectiveRole,
      permissions: effectivePermissions,
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
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "Forbidden: insufficient role",
        required: allowedRoles,
        current: role,
      });
    }
    return next();
  };

/**
 * Permission-based authorization.
 * Usage: requirePermissions("course:create", "course:edit")
 */
export const requirePermissions =
  (...required: Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Super-admin bypasses fine-grained permission checks
    if (req.user?.role === "super-admin") return next();
    const userPermissions = req.user?.permissions ?? [];
    const missing = required.filter((p) => !userPermissions.includes(p));
    if (missing.length) {
      return res.status(403).json({
        message: "Forbidden: missing permissions",
        missing,
        required,
      });
    }
    return next();
  };

/**
 * Require ANY of the specified permissions
 * Usage: requireAnyPermission("course:manage_own", "course:manage_all")
 */
export const requireAnyPermission =
  (...permissions: Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Super-admin bypasses fine-grained permission checks
    if (req.user?.role === "super-admin") return next();
    const userPermissions = req.user?.permissions ?? [];

    if (!hasAnyPermission(userPermissions, permissions)) {
      return res.status(403).json({
        message:
          "Forbidden: insufficient permissions (need any one of the listed permissions)",
        required: permissions,
        mode: "any",
      });
    }
    return next();
  };

/**
 * Check if user can manage a specific resource (own vs all)
 * Usage: canManageResource("course") - checks course:manage_own or course:manage_all
 */
export const requireResourceManagement =
  (resourceType: "course" | "blog" | "quiz" | "module" | "content") =>
  (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions ?? [];
    const manageOwn = `${resourceType}:manage_own` as Permission;
    const manageAll = `${resourceType}:manage_all` as Permission;

    if (!hasAnyPermission(userPermissions, [manageOwn, manageAll])) {
      return res.status(403).json({
        message: `Forbidden: cannot manage ${resourceType}`,
        required: [manageOwn, manageAll],
      });
    }
    return next();
  };

/**
 * Ownership middleware - ensures user owns the resource or has manage_all permission
 * Usage: ensureOwnershipOrManageAll("course", "instructorId")
 */
export const ensureOwnershipOrManageAll =
  (
    resourceType: "course" | "blog" | "quiz" | "module" | "content",
    ownerField = "instructor"
  ) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const userPermissions = user.permissions ?? [];
      const manageAllPermission = `${resourceType}:manage_all` as Permission;

      // If user has manage_all permission, they can access any resource
      if (hasPermission(userPermissions, manageAllPermission)) {
        return next();
      }

      // Otherwise, check ownership
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({ message: "Resource ID required" });
      }

      // This would need to be customized based on your models
      // For now, we'll do a generic check
      let resource;
      switch (resourceType) {
        case "course":
          // We'll implement this when the course models are properly set up
          // For now, just check if the user has course management permissions
          const courseManageAll = hasPermission(
            userPermissions,
            "course:manage_all"
          );
          if (courseManageAll) return next();

          return res.status(403).json({
            message: "Course ownership checking not implemented yet",
          });
        case "blog":
          // We'll implement this when blog models are available
          const blogManageAll = hasPermission(
            userPermissions,
            "blog:manage_all"
          );
          if (blogManageAll) return next();

          return res.status(403).json({
            message: "Blog ownership checking not implemented yet",
          });
        // Add other resource types as needed
      }

      if (!resource) {
        return res.status(404).json({ message: `${resourceType} not found` });
      }

      const ownerId =
        resource[ownerField === "instructor" ? "instructor" : "author"];
      if (String(ownerId) !== user.id) {
        return res.status(403).json({
          message: `Only the owner or users with manage_all permission can access this ${resourceType}`,
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: "Error checking ownership" });
    }
  };

/**
 * Course-specific ownership check
 */
export const ensureCourseOwnerOrManageAll = ensureOwnershipOrManageAll(
  "course",
  "instructor"
);

/**
 * Blog-specific ownership check
 */
export const ensureBlogOwnerOrManageAll = ensureOwnershipOrManageAll(
  "blog",
  "author"
);

/**
 * Student enrollment check - ensures user is enrolled in course or is instructor/admin
 * Note: This is a placeholder implementation - update when course models are properly integrated
 */
export const requireCourseAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user!;
    const courseId = req.params.courseId || req.params.id;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID required" });
    }

    // Check if user has course management permissions
    const userPermissions = user.permissions ?? [];
    if (
      hasAnyPermission(userPermissions, [
        "course:manage_all",
        "course:view_analytics",
      ])
    ) {
      return next();
    }

    // For now, just check permissions - implement course enrollment checking later
    if (!hasPermission(userPermissions, "course:view")) {
      return res.status(403).json({
        message:
          "Access denied: Insufficient permissions to access course content",
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: "Error checking course access" });
  }
};

/**
 * User management authorization - ensures user can manage target user
 */
export const requireUserManagement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const manager = req.user!;
    const targetUserId = req.params.userId || req.params.id;

    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID required" });
    }

    // Users can always manage their own account
    if (manager.id === targetUserId) {
      return next();
    }

    // Check if manager has user management permissions
    const userPermissions = manager.permissions ?? [];
    if (
      !hasAnyPermission(userPermissions, [
        "user:manage_roles",
        "user:edit",
        "user:delete",
      ])
    ) {
      return res
        .status(403)
        .json({ message: "Insufficient permissions to manage users" });
    }

    // Get target user to check role hierarchy
    const targetUser = await User.findById(targetUserId).select("role").lean();
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Ensure manager has higher role than target
    if (!canManageUser(manager.role, targetUser.role as UserRole)) {
      return res.status(403).json({
        message: "Cannot manage user with equal or higher role",
        managerRole: manager.role,
        targetRole: targetUser.role,
      });
    }

    return next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error checking user management permissions" });
  }
};

/**
 * Backwards-compatible admin-only guard
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const allowedRoles: UserRole[] = ["admin", "super-admin"];
  if (!allowedRoles.includes(req.user?.role as UserRole)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/**
 * Super admin only guard
 */
export const superAdminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "super-admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
};

/**
 * Rate limiting based on role
 */
export const roleBasedRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const role = req.user?.role;

  // Set rate limits based on role (implement with your preferred rate limiting library)
  const rateLimits = {
    user: 100, // requests per hour
    student: 200,
    instructor: 500,
    author: 300,
    editor: 400,
    moderator: 600,
    admin: 1000,
    "super-admin": -1, // unlimited
  };

  // Store rate limit info in request for use by rate limiting middleware
  req.rateLimit = rateLimits[role as UserRole] || 100;

  next();
};
