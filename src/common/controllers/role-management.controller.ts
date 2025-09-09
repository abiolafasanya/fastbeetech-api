// role-management.controller.ts - Controller for role and permission management
import { Request, Response } from "express";
import { RoleManagementService } from "../services/role-management.service";
import { UserRole, Permission } from "../config/roles-permissions";
import { User } from "../../module/user/model";

export class RoleManagementController {
  /**
   * Assign role to user
   * POST /api/admin/users/:userId/role
   */
  static async assignRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = req.body as { role: UserRole };
      const assignedBy = req.user!.id;

      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      await RoleManagementService.assignRole(userId, role, assignedBy);

      res.json({
        status: true,
        message: "Role assigned successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error ? error.message : "Failed to assign role",
      });
    }
  }

  /**
   * Add custom permissions to user
   * POST /api/admin/users/:userId/permissions
   */
  static async addPermissions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { permissions } = req.body as { permissions: Permission[] };
      const assignedBy = req.user!.id;

      if (!permissions || !Array.isArray(permissions)) {
        return res
          .status(400)
          .json({ message: "Permissions array is required" });
      }

      await RoleManagementService.addCustomPermissions(
        userId,
        permissions,
        assignedBy
      );

      res.json({
        status: true,
        message: "Permissions added successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error ? error.message : "Failed to add permissions",
      });
    }
  }

  /**
   * Remove custom permissions from user
   * DELETE /api/admin/users/:userId/permissions
   */
  static async removePermissions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { permissions } = req.body as { permissions: Permission[] };
      const removedBy = req.user!.id;

      if (!permissions || !Array.isArray(permissions)) {
        return res
          .status(400)
          .json({ message: "Permissions array is required" });
      }

      await RoleManagementService.removeCustomPermissions(
        userId,
        permissions,
        removedBy
      );

      res.json({
        status: true,
        message: "Permissions removed successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to remove permissions",
      });
    }
  }

  /**
   * Reset user permissions to role defaults
   * POST /api/admin/users/:userId/reset-permissions
   */
  static async resetPermissions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const resetBy = req.user!.id;

      await RoleManagementService.resetToRoleDefaults(userId, resetBy);

      res.json({
        status: true,
        message: "Permissions reset to role defaults",
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to reset permissions",
      });
    }
  }

  /**
   * Get all users with roles and permissions
   * GET /api/admin/users/roles
   */
  static async getUsersWithRoles(req: Request, res: Response) {
    try {
      const requestedBy = req.user!.id;
      const { role, permissions } = req.query;

      const filters: any = {};
      if (role) filters.role = role as UserRole;
      if (permissions) {
        filters.permissions = Array.isArray(permissions)
          ? (permissions as Permission[])
          : [permissions as Permission];
      }

      const users = await RoleManagementService.getUsersWithRoles(
        requestedBy,
        filters
      );

      res.json({
        status: true,
        data: users,
        message: "Users retrieved successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error ? error.message : "Failed to retrieve users",
      });
    }
  }

  /**
   * Bulk assign role to multiple users
   * POST /api/admin/users/bulk-assign-role
   */
  static async bulkAssignRole(req: Request, res: Response) {
    try {
      const { userIds, role } = req.body as {
        userIds: string[];
        role: UserRole;
      };
      const assignedBy = req.user!.id;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "User IDs array is required" });
      }

      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      const results = await RoleManagementService.bulkAssignRole(
        userIds,
        role,
        assignedBy
      );

      res.json({
        status: true,
        data: results,
        message: `Role assignment completed. ${results.success.length} successful, ${results.failed.length} failed.`,
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to bulk assign roles",
      });
    }
  }

  /**
   * Get role hierarchy and permissions
   * GET /api/admin/roles/hierarchy
   */
  static async getRoleHierarchy(req: Request, res: Response) {
    try {
      const hierarchy = RoleManagementService.getRoleHierarchy();

      res.json({
        status: true,
        data: hierarchy,
        message: "Role hierarchy retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Failed to retrieve role hierarchy",
      });
    }
  }

  /**
   * Get permission analysis for a user
   * GET /api/admin/users/:userId/permissions/analysis
   */
  static async getPermissionAnalysis(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const requestedBy = req.user!.id;

      const analysis = await RoleManagementService.getPermissionAnalysis(
        userId,
        requestedBy
      );

      res.json({
        status: true,
        data: analysis,
        message: "Permission analysis retrieved successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to get permission analysis",
      });
    }
  }

  /**
   * Validate role transition
   * POST /api/admin/users/:userId/validate-role-change
   */
  static async validateRoleTransition(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { newRole } = req.body as { newRole: UserRole };
      const assignerRole = req.user!.role;

      if (!newRole) {
        return res.status(400).json({ message: "New role is required" });
      }

      // Get current user role
      const user = await User.findById(userId).select("role");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validation = RoleManagementService.validateRoleTransition(
        user.role,
        newRole,
        assignerRole
      );

      res.json({
        status: validation.valid,
        data: {
          valid: validation.valid,
          currentRole: user.role,
          newRole,
          assignerRole,
          error: validation.error,
        },
        message: validation.valid
          ? "Role transition is valid"
          : "Role transition is invalid",
      });
    } catch (error) {
      res.status(400).json({
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to validate role transition",
      });
    }
  }
}
