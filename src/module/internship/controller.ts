import { Request, Response } from "express";
import { InternApplication } from "./model"; // adjust path
import { paginate } from "../../common/utils/pagination";
import catchAsync from "../../shared/request";
import schema from "./validation/internship";

export const InternshipController = {
  findAll: catchAsync(async (req: Request, res: Response) => {}),

  findOne: catchAsync(async (req: Request, res: Response) => {}),

  create: catchAsync(async (req: Request, res: Response) => {
     try {
       const payload = schema.parse(req.body);
       const doc = await InternApplication.create(payload);
       return res
         .status(201)
         .json({ message: "Application received", id: doc._id, status: true });
     } catch (err) {
       return res.status(400).json({ error: "Invalid data", details: err });
     }
  }),

  update: catchAsync(async (req: Request, res: Response) => {}),

  remove: catchAsync(async (req: Request, res: Response) => {}),
};
