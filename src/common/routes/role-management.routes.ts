// role-management.routes.ts - Routes for role and permission management
import { Router } from "express";
import { RoleManagementController } from "../controllers/role-management.controller";
import {
  authenticate,
  requirePermissions,
  requireUserManagement,
} from "../middleware/enhanced-auth";

export default function roleManagementRoutes(router: Router) {
  // All routes require authentication
  router.use(authenticate);

  // Role Management Routes

  // Assign role to user - requires user:manage_roles permission
  router.post(
    "/admin/users/:userId/role",
    requirePermissions("user:manage_roles"),
    requireUserManagement,
    RoleManagementController.assignRole
  );

  // Add custom permissions to user - requires user:manage_permissions
  router.post(
    "/admin/users/:userId/permissions",
    requirePermissions("user:manage_permissions"),
    requireUserManagement,
    RoleManagementController.addPermissions
  );

  // Remove custom permissions from user - requires user:manage_permissions
  router.delete(
    "/admin/users/:userId/permissions",
    requirePermissions("user:manage_permissions"),
    requireUserManagement,
    RoleManagementController.removePermissions
  );

  // Reset user permissions to role defaults - requires user:manage_permissions
  router.post(
    "/admin/users/:userId/reset-permissions",
    requirePermissions("user:manage_permissions"),
    requireUserManagement,
    RoleManagementController.resetPermissions
  );

  // Get users with roles and permissions - requires user:view
  router.get(
    "/admin/users/roles",
    requirePermissions("user:view"),
    RoleManagementController.getUsersWithRoles
  );

  // Bulk assign role - requires user:manage_roles
  router.post(
    "/admin/users/bulk-assign-role",
    requirePermissions("user:manage_roles"),
    RoleManagementController.bulkAssignRole
  );

  // Get role hierarchy - requires user:view (informational)
  router.get(
    "/admin/roles/hierarchy",
    requirePermissions("user:view"),
    RoleManagementController.getRoleHierarchy
  );

  // Get permission analysis for user - requires user:view
  router.get(
    "/admin/users/:userId/permissions/analysis",
    requirePermissions("user:view"),
    RoleManagementController.getPermissionAnalysis
  );

  // Validate role transition - requires user:manage_roles
  router.post(
    "/admin/users/:userId/validate-role-change",
    requirePermissions("user:manage_roles"),
    requireUserManagement,
    RoleManagementController.validateRoleTransition
  );
}
