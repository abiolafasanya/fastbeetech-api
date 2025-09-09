# Roles and Permissions System Documentation

## Overview

This document outlines the comprehensive roles and permissions system implemented for the FastBee Tech platform, which includes courses, blogs, internships, and user management.

## Role Hierarchy

The system implements 8 distinct roles with increasing levels of privilege:

### 1. **User** (Basic Level)
- **Purpose**: General public users who browse the platform
- **Key Permissions**:
  - View public courses and blogs
  - Comment on blog posts
  - View and apply for internships
  - Manage their own profile
- **Use Cases**: Visitors, potential students, job seekers

### 2. **Student** (Learning Level)
- **Purpose**: Users enrolled in courses for learning
- **Additional Permissions** (beyond User):
  - Enroll in courses
  - Access course content and modules
  - Take quizzes and view results
  - Download course materials
  - View basic analytics of their progress
- **Use Cases**: Course participants, learners

### 3. **Instructor** (Teaching Level)
- **Purpose**: Content creators who develop and teach courses
- **Key Permissions**:
  - Create and manage their own courses
  - Create modules, content, and quizzes for their courses
  - Publish courses
  - Enroll students in their courses
  - View course analytics and student progress
  - Issue certificates
  - Communicate with students
  - View payment information for their courses
- **Use Cases**: Subject matter experts, teachers, trainers

### 4. **Author** (Content Creation Level)
- **Purpose**: Blog content creators and writers
- **Key Permissions**:
  - Create and manage their own blog posts
  - Publish blog content
  - View basic analytics for their content
- **Use Cases**: Blog writers, content creators, marketing team

### 5. **Editor** (Content Management Level)
- **Purpose**: Content reviewers and editors across the platform
- **Key Permissions**:
  - Edit courses, modules, and content (not just their own)
  - Edit and manage all blog posts
  - Publish/unpublish content
  - Moderate comments
  - View basic analytics
- **Use Cases**: Content quality managers, editorial team

### 6. **Moderator** (Community Management Level)
- **Purpose**: Platform community and interaction managers
- **Key Permissions**:
  - Moderate all user-generated content
  - Manage comments and discussions
  - Review and manage internship applications
  - Communicate with users
  - Manage user interactions
- **Use Cases**: Community managers, customer support leads

### 7. **Admin** (Platform Management Level)
- **Purpose**: Full platform operations management
- **Key Permissions**:
  - Manage all courses, blogs, and content
  - Full user management (except super-admin)
  - View financial and advanced analytics
  - Process payments and refunds
  - Manage internship programs
  - Issue certificates
  - Export data
- **Use Cases**: Platform managers, business administrators

### 8. **Super Admin** (System Level)
- **Purpose**: Complete system access and control
- **Key Permissions**:
  - All permissions in the system
  - System-level operations (backup, restore, configuration)
  - User impersonation
  - System maintenance and logs
  - Manage other admins
- **Use Cases**: Technical administrators, system owners

## Permission Categories

### Course Management
- `course:view` - View course content
- `course:create` - Create new courses
- `course:edit` - Edit course information
- `course:delete` - Delete courses
- `course:publish` - Publish/unpublish courses
- `course:manage_own` - Manage only own courses
- `course:manage_all` - Manage all courses
- `course:enroll_students` - Enroll/unenroll students
- `course:view_analytics` - View course performance data

### Student Management
- `student:view` - View student information
- `student:enroll` - Enroll in courses
- `student:unenroll` - Leave courses
- `student:view_progress` - View learning progress
- `student:manage_progress` - Modify student progress
- `student:issue_certificates` - Issue completion certificates
- `student:communicate` - Communicate with students

### Content Management
- `content:view` - View content
- `content:create` - Create new content
- `content:edit` - Edit content
- `content:delete` - Delete content
- `content:upload` - Upload files/media
- `content:download` - Download materials
- `content:manage_own` - Manage only own content
- `content:manage_all` - Manage all content

### Quiz Management
- `quiz:view` - View quizzes
- `quiz:create` - Create quizzes
- `quiz:edit` - Edit quiz questions
- `quiz:delete` - Delete quizzes
- `quiz:take` - Take/attempt quizzes
- `quiz:view_results` - View quiz results
- `quiz:grade` - Grade quiz submissions
- `quiz:manage_own` - Manage only own quizzes
- `quiz:manage_all` - Manage all quizzes

### Blog Management
- `blog:view` - View blog posts
- `blog:create` - Create blog posts
- `blog:edit` - Edit blog content
- `blog:delete` - Delete blog posts
- `blog:publish` - Publish/unpublish posts
- `blog:comment` - Comment on posts
- `blog:moderate_comments` - Moderate comments
- `blog:manage_own` - Manage only own posts
- `blog:manage_all` - Manage all blog content

### User Management
- `user:view` - View user profiles
- `user:create` - Create new users
- `user:edit` - Edit user information
- `user:delete` - Delete users
- `user:manage_roles` - Assign/change user roles
- `user:manage_permissions` - Grant/revoke permissions
- `user:impersonate` - Login as another user

### Analytics & Reporting
- `analytics:view_basic` - View basic analytics
- `analytics:view_advanced` - View detailed analytics
- `analytics:export_data` - Export data reports
- `analytics:view_financial` - View financial reports

### Payment & Financial
- `payment:view` - View payment information
- `payment:process` - Process payments
- `payment:refund` - Issue refunds
- `payment:view_reports` - View financial reports
- `payment:manage_pricing` - Manage course pricing

## Implementation Examples

### Protecting Routes

```typescript
// Require specific permissions
router.post('/courses', 
  authenticate, 
  requirePermissions('course:create'),
  CourseController.create
);

// Require role-based access
router.get('/admin/dashboard',
  authenticate,
  authorize('admin', 'super-admin'),
  AdminController.dashboard
);

// Require resource ownership or management permission
router.put('/courses/:id',
  authenticate,
  requireResourceManagement('course'),
  ensureCourseOwnerOrManageAll,
  CourseController.update
);
```

### Checking Permissions in Controllers

```typescript
// Check user permissions
if (!req.user.hasPermission('course:publish')) {
  return res.status(403).json({ message: 'Cannot publish courses' });
}

// Check multiple permissions
if (!req.user.hasAnyPermission(['course:manage_own', 'course:manage_all'])) {
  return res.status(403).json({ message: 'Cannot manage courses' });
}
```

### Role Management

```typescript
// Assign role
await RoleManagementService.assignRole(userId, 'instructor', adminId);

// Add custom permissions
await RoleManagementService.addCustomPermissions(
  userId, 
  ['course:view_analytics'], 
  adminId
);
```

## Security Considerations

1. **Role Hierarchy**: Users can only manage users with lower roles
2. **Permission Inheritance**: Roles inherit permissions, custom permissions are additive
3. **Ownership Checks**: Users can manage their own resources even without `manage_all` permissions
4. **Rate Limiting**: Different roles have different API rate limits
5. **Audit Trail**: All role and permission changes are logged

## API Endpoints

### Role Management
- `POST /api/admin/users/:userId/role` - Assign role
- `POST /api/admin/users/:userId/permissions` - Add permissions
- `DELETE /api/admin/users/:userId/permissions` - Remove permissions
- `GET /api/admin/users/roles` - List users with roles
- `POST /api/admin/users/bulk-assign-role` - Bulk role assignment

### Permission Management
- `GET /api/admin/roles/hierarchy` - Get role hierarchy
- `GET /api/admin/users/:userId/permissions/analysis` - Analyze user permissions
- `POST /api/admin/users/:userId/validate-role-change` - Validate role transition

## Best Practices

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Regular Audits**: Review user roles and permissions regularly
3. **Role-Based Design**: Design features around roles, not individual users
4. **Clear Documentation**: Document permission requirements for new features
5. **Testing**: Test permission boundaries thoroughly

## Migration Guide

When upgrading existing systems:

1. **Map Current Roles**: Map existing roles to new role hierarchy
2. **Update Middleware**: Replace old auth middleware with new permission-based system
3. **Database Migration**: Update user documents with new role structure
4. **Frontend Updates**: Update UI to reflect new permission system
5. **Testing**: Thoroughly test all role transitions

## Troubleshooting

### Common Issues:

1. **Permission Denied Errors**: Check user has required permissions
2. **Role Assignment Failures**: Ensure assigner has higher role
3. **Custom Permission Issues**: Verify admin role for custom permissions
4. **Ownership Problems**: Check resource ownership vs management permissions

### Debug Commands:

```typescript
// Check user permissions
const analysis = await RoleManagementService.getPermissionAnalysis(userId, adminId);

// Validate role change
const validation = RoleManagementService.validateRoleTransition(currentRole, newRole, assignerRole);
```

This comprehensive system provides fine-grained control over user access while maintaining simplicity for common use cases.
