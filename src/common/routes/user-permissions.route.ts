import { Router } from "express";
import {
  getUserPermissions,
  checkUserPermission,
  checkUserAnyPermissions,
} from "../controllers/user-permissions.controller";
import { authenticate } from "../middleware/auth";

export default function userPermissionsRoutes(router: Router) {

  // All routes require authentication
  router.use(authenticate);

/**
 * @route GET /api/v1/me/permissions
 * @desc Get current user's permissions
 * @access Private (authenticated users)
 */
router.get("/", getUserPermissions);

/**
 * @route POST /api/v1/me/permissions/check
 * @desc Check if user has specific permission
 * @access Private (authenticated users)
 */
router.post("/check", checkUserPermission);

/**
 * @route POST /api/v1/me/permissions/check-any
 * @desc Check if user has any of the specified permissions
 * @access Private (authenticated users)
 */
router.post("/check-any", checkUserAnyPermissions);

}

