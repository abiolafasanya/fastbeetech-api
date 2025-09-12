import { Router } from "express";
import { FeaturesController } from "../controllers/features.controller";

export default function featuresRoutes(router: Router) {
  router.get("/features", FeaturesController.getFeatures);
}
