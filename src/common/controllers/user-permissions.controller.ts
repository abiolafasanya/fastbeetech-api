import { Request, Response } from "express";
import { User } from "../../module/user/model";
import { getRolePermissions, Permission } from "../config/roles-permissions";

interface AuthenticatedRequest extends Request {
  user: Express.UserJwtPayload & {
    permissions: string[];
    hasPermission: (permission: Permission) => boolean;
  };
}

/**
 * Get current user's permissions
 * GET /api/v1/me/permissions
 */
export async function getUserPermissions(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    // Fetch user from database to get latest permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Get role-based permissions
    const rolePermissions = getRolePermissions(user.role || "student");

    // Get user's computed permissions (includes role + extra permissions)
    const userPermissions = user.permissions || [];

    // Get extra permissions (permissions beyond the role)
    const extraPermissions = user.extraPermissions || [];

    return res.json({
      status: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role || "student",
          isEmailVerified: user.isEmailVerified,
        },
        permissions: {
          // All effective permissions on the user
          effective: userPermissions,
          // Permissions from the user's role
          fromRole: rolePermissions,
          // Extra permissions granted specifically to this user
          extra: extraPermissions,
          // New multi-role permissions (if using new system)
          roles: user.roles || [],
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching user permissions:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch user permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * Check if current user has specific permission
 * POST /api/v1/me/permissions/check
 * Body: { permission: string }
 */
export async function checkUserPermission(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const { permission } = req.body;

    if (!permission) {
      return res.status(400).json({
        status: false,
        message: "Permission is required",
      });
    }

    const hasPermission = authReq.user.hasPermission(permission as Permission);

    return res.json({
      status: true,
      data: {
        permission,
        hasPermission,
        user: {
          id: authReq.user.id,
          role: authReq.user.role,
        },
      },
    });
  } catch (error: any) {
    console.error("Error checking user permission:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to check permission",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * Check if current user has any of the specified permissions
 * POST /api/v1/me/permissions/check-any
 * Body: { permissions: string[] }
 */
export async function checkUserAnyPermissions(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        status: false,
        message: "Permissions array is required",
      });
    }

    const results = permissions.map((permission: string) => ({
      permission,
      hasPermission: authReq.user.hasPermission(permission as Permission),
    }));

    const hasAnyPermission = results.some((result) => result.hasPermission);

    return res.json({
      status: true,
      data: {
        hasAnyPermission,
        results,
        user: {
          id: authReq.user.id,
          role: authReq.user.role,
        },
      },
    });
  } catch (error: any) {
    console.error("Error checking user permissions:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to check permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
