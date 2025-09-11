import { Router } from "express";
import { CourseController } from "./controller";
import {
  authenticate,
  authorize,
  optionalAuth,
} from "../../common/middleware/auth";
import {
  requirePermission,
  requireAnyPermission,
} from "../../common/middleware/permission";

export default function (router: Router) {
  // Public routes
  router.get("/courses", CourseController.findAll);
  router.get("/courses/:slugOrId", optionalAuth, CourseController.findOne);
  router.get("/courses/:id/reviews", CourseController.getReviews);
  router.get("/categories", CourseController.getCategories);
  router.get("/instructors", CourseController.getInstructors);

  // Authenticated user routes
  router.post("/courses/:id/enroll", authenticate, CourseController.enroll);
  router.post("/courses/:id/unenroll", authenticate, CourseController.unenroll);
  router.put(
    "/courses/:id/progress",
    authenticate,
    CourseController.updateProgress
  );
  router.post(
    "/courses/:id/quiz/:quizId/attempt",
    authenticate,
    CourseController.submitQuiz
  );
  router.get(
    "/courses/:id/progress",
    authenticate,
    CourseController.getProgress
  );
  router.post("/courses/:id/review", authenticate, CourseController.addReview);
  router.put(
    "/reviews/:reviewId/helpful",
    authenticate,
    CourseController.markReviewHelpful
  );
  router.get("/my-courses", authenticate, CourseController.getMyCourses);

  // Instructor/Author routes - using new permission system
  router.post(
    "/courses",
    authenticate,
    requireAnyPermission(["course:create", "course:manage_all"]),
    CourseController.create
  );
  router.put(
    "/courses/:id",
    authenticate,
    requireAnyPermission([
      "course:edit",
      "course:manage_all",
      "course:manage_own",
    ]),
    CourseController.update
  );
  router.delete(
    "/courses/:id",
    authenticate,
    authorize("admin", "author"),
    CourseController.delete
  );
  router.get(
    "/courses/:id/analytics",
    authenticate,
    authorize("admin", "author"),
    CourseController.getAnalytics
  );

  // Instructor dashboard - list own courses (including drafts)
  router.get(
    "/dashboard/courses",
    authenticate,
    authorize("admin", "author"),
    CourseController.getInstructorCourses
  );

  // Instructor dashboard - get single course (including drafts)
  router.get(
    "/dashboard/courses/:slugOrId",
    authenticate,
    authorize("admin", "author"),
    CourseController.getInstructorCourse
  );

  // Admin only routes
  router.patch(
    "/courses/:id/publish",
    authenticate,
    authorize("admin"),
    CourseController.publish
  );
  router.get(
    "/admin/courses",
    authenticate,
    authorize("admin"),
    CourseController.getAllCourses
  );
  router.post(
    "/admin/courses/bulk",
    authenticate,
    authorize("admin"),
    CourseController.bulkUpdate
  );
}
