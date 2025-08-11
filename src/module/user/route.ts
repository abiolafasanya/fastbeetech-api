import { Router } from "express";
import AuthController from "./controller";
import { authenticate } from "../../common/middleware/auth";

export default function (router: Router) {
  router.post("/auth", AuthController.login);
  router.post("/auth/register", AuthController.register);
  router.post("/auth/logout", AuthController.logout);
  router.get("/auth/me", authenticate, AuthController.me);
  router.patch("/auth/profile", authenticate, AuthController.updateProfile);
  router.post(
    "/auth/change-password",
    authenticate,
    AuthController.changePassword
  );
  router.post("/auth/forgot-password", AuthController.forgotPassword);
  router.post("/auth/reset-password", AuthController.resetPassword);
  router.get("/auth/verify-email", AuthController.verifyEmail);

  router.post(
    "/auth/phone/send-code",
    authenticate,
    AuthController.requestPhoneVerificationCode
  );
  router.post(
    "/auth/phone/verify-code",
    authenticate,
    AuthController.verifyPhoneCode
  );
}
