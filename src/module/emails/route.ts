import { Router } from "express";
import { EmailLogController } from "./controller";
import { adminOnly, authenticate } from "../../common/middleware/auth"; // adjust as needed


export default function (router: Router) {
router.get(
  "/admin/email-logs",
  authenticate,
  adminOnly,
  EmailLogController.getLogs
);
}


