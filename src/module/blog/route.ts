// blog/route.ts
import { Router } from "express";
import { authenticate, authorize } from "../../common/middleware/auth";
import { BlogPostController } from "./controller";
import { ensureOwnerOrAdmin } from "../../common/utils/ownership";

export default function (router: Router) {
  // Public
  router.get("/posts", BlogPostController.findAll);
  router.get("/posts/:slug", BlogPostController.findOne);
  router.get("/posts/:slug/comments", BlogPostController.listComments);
  router.post("/posts/:id/view", BlogPostController.addView);
  router.post("/posts/:id/react", authenticate, BlogPostController.react); // require auth for per-user reactions
  router.post("/posts/:id/share", authenticate, BlogPostController.share); // require auth for per-user share
  // router.ts
  router.get("/admin/posts", authenticate, BlogPostController.allPosts);
  router.get(
    "/admin/posts/:id",
    authenticate,
    authorize("admin"),
    BlogPostController.findById
  );

  // Admin
  router.post(
    "/posts",
    authenticate,
    authorize("admin", "author"),
    BlogPostController.create
  );

  router.put(
    "/posts/:id",
    authenticate,
    authorize("admin", "editor", "author"),
    ensureOwnerOrAdmin,
    BlogPostController.update
  );

  router.patch(
    "/posts/:id/publish",
    authenticate,
    authorize("admin"),
    BlogPostController.publish
  );

  router.patch(
    "/posts/:id/schedule",
    authenticate,
    authorize("admin"),
    BlogPostController.schedule
  );

  router.patch(
    "/posts/:id/feature",
    authenticate,
    authorize("admin"),
    BlogPostController.toggleFeature
  );

  router.delete(
    "/posts/:id",
    authenticate,
    authorize("admin", "editor", "author"),
    ensureOwnerOrAdmin,
    BlogPostController.remove
  );

  // Comments
  router.post("/posts/:id/comments", BlogPostController.addComment); // you may want captcha/ratelimit
  router.patch(
    "/posts/:id/comments/:commentId",
    authenticate,
    authorize("admin"),
    BlogPostController.moderateComment
  );

  // Moderation: List all comments for admin dashboard
  router.get(
    "/admin/comments",
    authenticate,
    authorize("admin"),
    BlogPostController.listAllComments
  );

  router.get(
    "/admin/posts/scheduled",
    authenticate,
    authorize("admin"),
    BlogPostController.scheduled
  );
}
