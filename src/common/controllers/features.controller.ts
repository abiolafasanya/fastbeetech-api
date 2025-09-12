import { Request, Response } from "express";
import { getFeatureFlags } from "../config/features";

export const FeaturesController = {
  getFeatures: (req: Request, res: Response) => {
    return res.json({ success: true, data: getFeatureFlags() });
  },
};
