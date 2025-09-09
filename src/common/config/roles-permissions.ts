// roles-permissions.ts - Comprehensive Role and Permission System
export type UserRole =
  | "user"
  | "student"
  | "instructor"
  | "author"
  | "editor"
  | "moderator"
  | "admin"
  | "super-admin";

// Permission categories and specific permissions
export interface PermissionCategories {
  // Course Management Permissions
  course: {
    view: "course:view";
    create: "course:create";
    edit: "course:edit";
    delete: "course:delete";
    publish: "course:publish";
    unpublish: "course:unpublish";
    manage_own: "course:manage_own";
    manage_all: "course:manage_all";
    enroll_students: "course:enroll_students";
    view_analytics: "course:view_analytics";
  };

  // Module Management Permissions
  module: {
    view: "module:view";
    create: "module:create";
    edit: "module:edit";
    delete: "module:delete";
    reorder: "module:reorder";
    manage_own: "module:manage_own";
    manage_all: "module:manage_all";
  };

  // Content Management Permissions
  content: {
    view: "content:view";
    create: "content:create";
    edit: "content:edit";
    delete: "content:delete";
    upload: "content:upload";
    download: "content:download";
    manage_own: "content:manage_own";
    manage_all: "content:manage_all";
  };

  // Quiz Management Permissions
  quiz: {
    view: "quiz:view";
    create: "quiz:create";
    edit: "quiz:edit";
    delete: "quiz:delete";
    take: "quiz:take";
    view_results: "quiz:view_results";
    grade: "quiz:grade";
    manage_own: "quiz:manage_own";
    manage_all: "quiz:manage_all";
  };

  // Student Management Permissions
  student: {
    view: "student:view";
    enroll: "student:enroll";
    unenroll: "student:unenroll";
    view_progress: "student:view_progress";
    manage_progress: "student:manage_progress";
    issue_certificates: "student:issue_certificates";
    communicate: "student:communicate";
  };

  // Blog Management Permissions
  blog: {
    view: "blog:view";
    create: "blog:create";
    edit: "blog:edit";
    delete: "blog:delete";
    publish: "blog:publish";
    unpublish: "blog:unpublish";
    comment: "blog:comment";
    moderate_comments: "blog:moderate_comments";
    manage_own: "blog:manage_own";
    manage_all: "blog:manage_all";
  };

  // Internship Management Permissions
  internship: {
    view: "internship:view";
    apply: "internship:apply";
    manage_applications: "internship:manage_applications";
    review_applications: "internship:review_applications";
    accept_reject: "internship:accept_reject";
    communicate: "internship:communicate";
    manage_program: "internship:manage_program";
  };

  // User Management Permissions
  user: {
    view: "user:view";
    create: "user:create";
    edit: "user:edit";
    delete: "user:delete";
    manage_roles: "user:manage_roles";
    manage_permissions: "user:manage_permissions";
    view_profile: "user:view_profile";
    edit_profile: "user:edit_profile";
    impersonate: "user:impersonate";
  };

  // Analytics Permissions
  analytics: {
    view_basic: "analytics:view_basic";
    view_advanced: "analytics:view_advanced";
    export_data: "analytics:export_data";
    view_financial: "analytics:view_financial";
  };

  // System Permissions
  system: {
    backup: "system:backup";
    restore: "system:restore";
    configure: "system:configure";
    maintenance: "system:maintenance";
    logs: "system:logs";
  };

  // Payment & Financial Permissions
  payment: {
    view: "payment:view";
    process: "payment:process";
    refund: "payment:refund";
    view_reports: "payment:view_reports";
    manage_pricing: "payment:manage_pricing";
  };
}

// All permissions as a flat array for easier management
export const ALL_PERMISSIONS = [
  // Course permissions
  "course:view",
  "course:create",
  "course:edit",
  "course:delete",
  "course:publish",
  "course:unpublish",
  "course:manage_own",
  "course:manage_all",
  "course:enroll_students",
  "course:view_analytics",

  // Module permissions
  "module:view",
  "module:create",
  "module:edit",
  "module:delete",
  "module:reorder",
  "module:manage_own",
  "module:manage_all",

  // Content permissions
  "content:view",
  "content:create",
  "content:edit",
  "content:delete",
  "content:upload",
  "content:download",
  "content:manage_own",
  "content:manage_all",

  // Quiz permissions
  "quiz:view",
  "quiz:create",
  "quiz:edit",
  "quiz:delete",
  "quiz:take",
  "quiz:view_results",
  "quiz:grade",
  "quiz:manage_own",
  "quiz:manage_all",

  // Student permissions
  "student:view",
  "student:enroll",
  "student:unenroll",
  "student:view_progress",
  "student:manage_progress",
  "student:issue_certificates",
  "student:communicate",

  // Blog permissions
  "blog:view",
  "blog:create",
  "blog:edit",
  "blog:delete",
  "blog:publish",
  "blog:unpublish",
  "blog:comment",
  "blog:moderate_comments",
  "blog:manage_own",
  "blog:manage_all",

  // Internship permissions
  "internship:view",
  "internship:apply",
  "internship:manage_applications",
  "internship:review_applications",
  "internship:accept_reject",
  "internship:communicate",
  "internship:manage_program",

  // User permissions
  "user:view",
  "user:create",
  "user:edit",
  "user:delete",
  "user:manage_roles",
  "user:manage_permissions",
  "user:view_profile",
  "user:edit_profile",
  "user:impersonate",

  // Analytics permissions
  "analytics:view_basic",
  "analytics:view_advanced",
  "analytics:export_data",
  "analytics:view_financial",

  // System permissions
  "system:backup",
  "system:restore",
  "system:configure",
  "system:maintenance",
  "system:logs",

  // Payment permissions
  "payment:view",
  "payment:process",
  "payment:refund",
  "payment:view_reports",
  "payment:manage_pricing",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// Role definitions with their default permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Basic user - can view public content and manage own profile
  user: [
    "course:view",
    "blog:view",
    "blog:comment",
    "internship:view",
    "internship:apply",
    "user:view_profile",
    "user:edit_profile",
  ],

  // Student - enrolled in courses, can take quizzes
  student: [
    "course:view",
    "module:view",
    "content:view",
    "content:download",
    "quiz:view",
    "quiz:take",
    "quiz:view_results",
    "student:enroll",
    "blog:view",
    "blog:comment",
    "internship:view",
    "internship:apply",
    "user:view_profile",
    "user:edit_profile",
    "analytics:view_basic",
  ],

  // Instructor - can create and manage own courses
  instructor: [
    "course:view",
    "course:create",
    "course:manage_own",
    "course:publish",
    "course:enroll_students",
    "course:view_analytics",
    "module:view",
    "module:create",
    "module:manage_own",
    "content:view",
    "content:create",
    "content:upload",
    "content:manage_own",
    "quiz:view",
    "quiz:create",
    "quiz:manage_own",
    "quiz:grade",
    "student:view",
    "student:view_progress",
    "student:issue_certificates",
    "student:communicate",
    "blog:view",
    "blog:comment",
    "user:view_profile",
    "user:edit_profile",
    "analytics:view_basic",
    "payment:view",
  ],

  // Author - can create and manage blog content
  author: [
    "course:view",
    "blog:view",
    "blog:create",
    "blog:manage_own",
    "blog:publish",
    "blog:comment",
    "internship:view",
    "user:view_profile",
    "user:edit_profile",
    "analytics:view_basic",
  ],

  // Editor - can edit content across the platform
  editor: [
    "course:view",
    "course:edit",
    "module:view",
    "module:edit",
    "content:view",
    "content:edit",
    "quiz:view",
    "quiz:edit",
    "blog:view",
    "blog:create",
    "blog:edit",
    "blog:publish",
    "blog:unpublish",
    "blog:manage_all",
    "blog:moderate_comments",
    "internship:view",
    "user:view_profile",
    "user:edit_profile",
    "analytics:view_basic",
  ],

  // Moderator - can moderate content and manage user interactions
  moderator: [
    "course:view",
    "module:view",
    "content:view",
    "quiz:view",
    "student:view",
    "student:communicate",
    "blog:view",
    "blog:edit",
    "blog:publish",
    "blog:unpublish",
    "blog:moderate_comments",
    "blog:manage_all",
    "internship:view",
    "internship:review_applications",
    "internship:communicate",
    "user:view",
    "user:edit_profile",
    "analytics:view_basic",
  ],

  // Admin - full platform management except system-level operations
  admin: [
    // Course permissions
    "course:view",
    "course:create",
    "course:edit",
    "course:delete",
    "course:publish",
    "course:unpublish",
    "course:manage_all",
    "course:enroll_students",
    "course:view_analytics",

    // Module permissions
    "module:view",
    "module:create",
    "module:edit",
    "module:delete",
    "module:reorder",
    "module:manage_all",

    // Content permissions
    "content:view",
    "content:create",
    "content:edit",
    "content:delete",
    "content:upload",
    "content:download",
    "content:manage_all",

    // Quiz permissions
    "quiz:view",
    "quiz:create",
    "quiz:edit",
    "quiz:delete",
    "quiz:grade",
    "quiz:manage_all",

    // Student permissions
    "student:view",
    "student:enroll",
    "student:unenroll",
    "student:view_progress",
    "student:manage_progress",
    "student:issue_certificates",
    "student:communicate",

    // Blog permissions
    "blog:view",
    "blog:create",
    "blog:edit",
    "blog:delete",
    "blog:publish",
    "blog:unpublish",
    "blog:moderate_comments",
    "blog:manage_all",

    // Internship permissions
    "internship:view",
    "internship:manage_applications",
    "internship:review_applications",
    "internship:accept_reject",
    "internship:communicate",
    "internship:manage_program",

    // User permissions
    "user:view",
    "user:create",
    "user:edit",
    "user:manage_roles",
    "user:manage_permissions",

    // Analytics permissions
    "analytics:view_basic",
    "analytics:view_advanced",
    "analytics:export_data",
    "analytics:view_financial",

    // Payment permissions
    "payment:view",
    "payment:process",
    "payment:refund",
    "payment:view_reports",
    "payment:manage_pricing",
  ],

  // Super Admin - full system access including system operations
  "super-admin": [...ALL_PERMISSIONS],
};

// Helper functions for permission checking
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: Permission
): boolean => {
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (
  userPermissions: string[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
};

export const hasAllPermissions = (
  userPermissions: string[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );
};

export const getRolePermissions = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

export const canManageResource = (
  userRole: UserRole,
  resourceType: "course" | "blog" | "quiz",
  action: "own" | "all"
): boolean => {
  const permissions = getRolePermissions(userRole);
  const permissionKey = `${resourceType}:manage_${action}` as Permission;
  return permissions.includes(permissionKey);
};

// Role hierarchy for role-based checks (higher index = more powerful)
export const ROLE_HIERARCHY: UserRole[] = [
  "user",
  "student",
  "author",
  "instructor",
  "editor",
  "moderator",
  "admin",
  "super-admin",
];

export const hasHigherRole = (
  userRole: UserRole,
  targetRole: UserRole
): boolean => {
  return ROLE_HIERARCHY.indexOf(userRole) > ROLE_HIERARCHY.indexOf(targetRole);
};

export const canManageUser = (
  managerRole: UserRole,
  targetRole: UserRole
): boolean => {
  // Users can only manage users with lower roles
  return hasHigherRole(managerRole, targetRole);
};
