// role-management.service.ts - Service for managing roles and permissions
import { User } from "../../module/user/model";
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  getRolePermissions,
  canManageUser,
  ROLE_HIERARCHY,
} from "../config/roles-permissions";

export class RoleManagementService {
  /**
   * Assign a role to a user and update their permissions
   */
  static async assignRole(
    userId: string,
    newRole: UserRole,
    assignedBy: string
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const assigner = await User.findById(assignedBy);
    if (!assigner) {
      throw new Error("Assigner not found");
    }

    // Check if assigner can manage the target user's role
    if (!canManageUser(assigner.role || "student", user.role || "student")) {
      throw new Error("Insufficient privileges to change user role");
    }

    // Check if assigner can assign the new role
    if (!canManageUser(assigner.role || "student", newRole)) {
      throw new Error("Cannot assign role higher than or equal to your own");
    }

    // Update user role and permissions
    user.role = newRole;
    user.permissions = getRolePermissions(newRole);

    await user.save();
  }

  /**
   * Add custom permissions to a user (in addition to role permissions)
   */
  static async addCustomPermissions(
    userId: string,
    permissions: Permission[],
    assignedBy: string
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const assigner = await User.findById(assignedBy);
    if (!assigner) {
      throw new Error("Assigner not found");
    }

    // Only admins and super-admins can assign custom permissions
    if (!["admin", "super-admin"].includes(assigner.role || "student")) {
      throw new Error("Only admins can assign custom permissions");
    }

    // Merge existing permissions with new ones (avoid duplicates)
    const existingPermissions = new Set(user.permissions);
    permissions.forEach((permission) => existingPermissions.add(permission));

    user.permissions = Array.from(existingPermissions);
    await user.save();
  }

  /**
   * Remove custom permissions from a user
   */
  static async removeCustomPermissions(
    userId: string,
    permissions: Permission[],
    removedBy: string
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const remover = await User.findById(removedBy);
    if (!remover) {
      throw new Error("Remover not found");
    }

    if (!["admin", "super-admin"].includes(remover.role || "student")) {
      throw new Error("Only admins can remove custom permissions");
    }

    // Remove specified permissions
    const rolePermissions = getRolePermissions(user.role || "student");
    user.permissions = user.permissions.filter(
      (permission) =>
        !permissions.includes(permission as Permission) ||
        rolePermissions.includes(permission as Permission)
    );

    await user.save();
  }

  /**
   * Reset user permissions to role defaults
   */
  static async resetToRoleDefaults(
    userId: string,
    resetBy: string
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const resetter = await User.findById(resetBy);
    if (!resetter) {
      throw new Error("Resetter not found");
    }

    if (!canManageUser(resetter.role || "student", user.role || "student")) {
      throw new Error("Insufficient privileges to reset user permissions");
    }

    user.permissions = getRolePermissions(user.role || "student");
    await user.save();
  }

  /**
   * Get all users with their roles and permissions
   */
  static async getUsersWithRoles(
    requestedBy: string,
    filters?: {
      role?: UserRole;
      permissions?: Permission[];
    }
  ) {
    const requester = await User.findById(requestedBy);
    if (!requester) {
      throw new Error("Requester not found");
    }

    // Only users with user management permissions can view user roles
    if (!requester.hasAnyPermission(["user:view", "user:manage_roles"])) {
      throw new Error("Insufficient permissions to view user roles");
    }

    let query: any = {};

    if (filters?.role) {
      query.role = filters.role;
    }

    if (filters?.permissions) {
      query.permissions = { $in: filters.permissions };
    }

    const users = await User.find(query)
      .select("name email role permissions avatar isEmailVerified createdAt")
      .lean();

    // Filter out users with higher roles than the requester (for security)
    return users.filter(
      (user) =>
        canManageUser(requester.role || "student", user.role as UserRole) ||
        user._id.toString() === requestedBy
    );
  }

  /**
   * Bulk role assignment
   */
  static async bulkAssignRole(
    userIds: string[],
    newRole: UserRole,
    assignedBy: string
  ): Promise<{
    success: string[];
    failed: { userId: string; error: string }[];
  }> {
    const assigner = await User.findById(assignedBy);
    if (!assigner) {
      throw new Error("Assigner not found");
    }

    if (!["admin", "super-admin"].includes(assigner.role || "student")) {
      throw new Error("Only admins can perform bulk role assignments");
    }

    const results = {
      success: [] as string[],
      failed: [] as { userId: string; error: string }[],
    };

    for (const userId of userIds) {
      try {
        await this.assignRole(userId, newRole, assignedBy);
        results.success.push(userId);
      } catch (error) {
        results.failed.push({
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Get role hierarchy and permissions information
   */
  static getRoleHierarchy() {
    return {
      hierarchy: ROLE_HIERARCHY.map((role, index) => ({
        role,
        level: index,
        permissions: getRolePermissions(role),
      })),
      rolePermissions: ROLE_PERMISSIONS,
    };
  }

  /**
   * Validate if a role transition is allowed
   */
  static validateRoleTransition(
    currentRole: UserRole,
    newRole: UserRole,
    assignerRole: UserRole
  ): { valid: boolean; error?: string } {
    // Can't assign role higher than or equal to your own
    if (!canManageUser(assignerRole, newRole)) {
      return {
        valid: false,
        error: "Cannot assign role higher than or equal to your own",
      };
    }

    // Can't modify user with higher or equal role
    if (!canManageUser(assignerRole, currentRole)) {
      return {
        valid: false,
        error: "Cannot modify user with higher or equal role",
      };
    }

    return { valid: true };
  }

  /**
   * Get permission analysis for a user
   */
  static async getPermissionAnalysis(userId: string, requestedBy: string, isAdmin?: boolean) {
    const user = await User.findById(userId).select("role permissions");
    const requester = await User.findById(requestedBy);

    if (!user || !requester) {
      throw new Error("User not found");
    }

    if (!isAdmin && userId !== requestedBy && !requester.hasPermission("user:view")) {
      throw new Error("Insufficient permissions to view user permissions");
    }

    const rolePermissions = getRolePermissions(user.role || "student");
    const customPermissions = user.permissions.filter(
      (p) => !rolePermissions.includes(p as Permission)
    );

    return {
      role: user.role,
      rolePermissions,
      customPermissions,
      allPermissions: user.permissions,
      analysis: {
        hasRolePermissions: rolePermissions.length,
        hasCustomPermissions: customPermissions.length,
        totalPermissions: user.permissions.length,
      },
    };
  }
}
