import { Router } from "express";
import UserManagementController from "../controllers/user-management.controller";
import {
  authenticate,
  requirePermissions,
  requireAnyPermission,
  requireUserManagement,
} from "../middleware/enhanced-auth";

export default function userManagementRoutes(router: Router) {
  // All routes require authentication
  router.use(authenticate);

  // List users
  router.get(
    "/admin/users",
    requireAnyPermission(
      "user:view",
      "user:manage_roles",
      "user:manage_permissions"
    ),
    UserManagementController.getUsers
  );

  // Get single user
  router.get(
    "/admin/users/:userId",
    requirePermissions("user:view"),
    UserManagementController.getUserById
  );

  // Create user (admin)
  router.post(
    "/admin/users",
    requirePermissions("user:create"),
    UserManagementController.createUser
  );

  // Update user (admin)
  router.put(
    "/admin/users/:userId",
    requirePermissions("user:edit"),
    requireUserManagement,
    UserManagementController.updateUser
  );

  // Delete user (admin)
  router.delete(
    "/admin/users/:userId",
    requirePermissions("user:delete"),
    requireUserManagement,
    UserManagementController.deleteUser
  );
}
