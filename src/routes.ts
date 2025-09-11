import { Router } from "express";
import InternsRoute from "./module/internship/route";
import EmailLogRoute from "./module/emails/route";
import { authenticate } from "./common/middleware/auth";
import BlogRoute from "./module/blog/route";
import AnalyticsRoute from "./module/analytics/route";
import CourseRoute from "./module/course/route";
import UserPermissionsRoute from "./common/routes/user-permissions.route";
import {
  uploadImageHandler,
  uploadMultipleImagesHandler,
} from "./common/utils/upload";
import AuthRoute from "./module/user/route";
export default function (router: Router) {
  router.get("/", (req, res) => {
    res.json({ status: "success", message: "Health Check" });
  });

  router.post("/upload", authenticate, uploadImageHandler);
  router.post("/uploads", authenticate, uploadMultipleImagesHandler);

  AuthRoute(router);
  InternsRoute(router);
  EmailLogRoute(router);
  BlogRoute(router);
  AnalyticsRoute(router);
  CourseRoute(router);

  // User permissions routes
  router.use("/me/permissions", UserPermissionsRoute);
}
