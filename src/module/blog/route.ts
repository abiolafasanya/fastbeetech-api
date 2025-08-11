import { Router } from "express";
import { authenticate } from "../../common/middleware/auth";
import { BlogPostController } from "./controller";

export default function (router: Router) {
  router.get("/posts", BlogPostController.findAll);
  router.get("/posts/:slug", BlogPostController.findOne);
  router.post("/posts", authenticate, BlogPostController.create);
  router.put("/posts/:id", authenticate, BlogPostController.update);
  router.delete("/posts/:id", authenticate, BlogPostController.remove);
}
