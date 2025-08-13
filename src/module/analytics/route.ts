import { Router } from "express";
import { BlogAnalyticsController } from "./controller";
import { authenticate, authorize } from "../../common/middleware/auth";
import { AdminStatsController } from "./analyticscontroller";

export default function (router: Router) {
  router.post("/analytics/events", BlogAnalyticsController.capture); // public
  router.get(
    "/admin/analytics/overview",
    authenticate,
    authorize("admin"),
    BlogAnalyticsController.overview
  );
  router.get(
    "/admin/analytics/top",
    authenticate,
    authorize("admin"),
    BlogAnalyticsController.top
  );
  router.get(
    "/admin/stats",
    authenticate,
    authorize("admin"),
    AdminStatsController.overview
  );
}
