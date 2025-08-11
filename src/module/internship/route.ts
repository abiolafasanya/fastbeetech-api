import { Router } from "express";
import { InternshipController } from "./controller";
import { authenticate } from "../../common/middleware/auth";

export default function (router: Router) {
  router.get("/internships", InternshipController.findAll);
  router.get("/internship/:id", InternshipController.findOne);
  router.post("/internship", InternshipController.create);
  router.put("/internship/:id", authenticate, InternshipController.update);
  router.delete("/internship/:id", authenticate, InternshipController.remove);
}
