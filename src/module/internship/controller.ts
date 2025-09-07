import { Request, Response } from "express";
import { InternApplication } from "./model"; // adjust path
import * as InternshipService from "./service";
import { paginate } from "../../common/utils/pagination";
import catchAsync from "../../shared/request";
import schema from "./validation/internship";
import { da } from "zod/v4/locales";
import { BadRequestException, NotFoundException } from "../../common/middleware/errors";

export const InternshipController = {
  // List all internship applications with pagination and search
  findAll: catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.pageSize as string) || 10;
    const search = (req.query.search as string)?.trim();
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const result = await paginate(InternApplication, query, {
      page,
      limit,
      sort: { createdAt: -1 },
    });
    return res.json({data: result, status: true});
  }),
  sendMail: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const app = await InternApplication.findById(id);
    if (!app) return res.status(404).json({ error: "Application not found" });
    const send = await InternshipService.sendConfirmationMail(
      app.email,
      app.name,
      app.status
    );
    console.log("Mail send result:", send);
    return res.json({ success: true, message: "Confirmation mail sent" });
  }),
  // List all internship applications with pagination and search
  // findAll: catchAsync(async (req: Request, res: Response) => {
  //   const page = parseInt(req.query.page as string) || 1;
  //   const limit = parseInt(req.query.pageSize as string) || 10;
  //   const search = (req.query.search as string)?.trim();
  //   const query: any = {};
  //   if (search) {
  //     query.$or = [
  //       { name: { $regex: search, $options: "i" } },
  //       { email: { $regex: search, $options: "i" } },
  //     ];
  //   }
  //   const result = await paginate(InternApplication, query, {
  //     page,
  //     limit,
  //     sort: { createdAt: -1 },
  //   });
  //   return res.json(result);
  // }),

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

  // Update status (accept/reject) or send mail
  update: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, sendMail } = req.body;
    const app = await InternApplication.findById(id);
    if (!app) return res.status(404).json({ error: "Application not found" });

    // Accept/Reject logic
    if (status && ["accepted", "rejected"].includes(status)) {
      app.status = status;
      await app.save();
    }

    // Send mail logic
    if (sendMail) {
      await InternshipService.sendConfirmationMail(
        app.email,
        app.name,
        app.status
      );
    }

    return res.json({ success: true, status: app.status });
  }),

  updateStatus: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
   try {
     if (!status || !["pending", "accepted", "rejected"].includes(status)) {
       throw new BadRequestException("Invalid status value");
     }
     console.log("Status to update:", status);
     const app = await InternApplication.findById(id);
     if (!app) throw new NotFoundException("Application not found");
     app.status = status;
     await app.save();
     return res.json({ success: true, data: { status: app.status } });
   } catch (error) {
     console.error("Error updating status:", error);
     if (error instanceof BadRequestException || error instanceof NotFoundException) {
       return res.status(400).json({ error: error.message });
     }
     return res.status(500).json({ error: "Failed to update status", reason: (error as Error).message });
   }
  }),

  remove: catchAsync(async (req: Request, res: Response) => {}),
};
