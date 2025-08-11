import mongoose, { Schema, Document, model } from "mongoose";

export interface InternApplicationType {
  name: string;
  email: string;
  phone: string;
  discipline: "Software Engineering" | "Graphics Design" | "Others";
  experience: "Beginner" | "Intermediate" | "Advanced";
  portfolioUrl?: string;
  resumeUrl?: string; // if you’ll upload to S3/Cloudinary
  notes?: string;
  status: "new" | "reviewing" | "accepted" | "rejected";
  source?: "website" | "referral" | "social" | "other";
}

export interface IInternApplication extends InternApplicationType, Document {}

const InternApplicationSchema = new Schema<IInternApplication>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    discipline: {
      type: String,
      enum: ["Software Engineering", "Graphics Design", "Other"],
      required: true,
    },
    experience: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      required: true,
    },
    portfolioUrl: { type: String },
    resumeUrl: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ["new", "reviewing", "accepted", "rejected"],
      default: "new",
      index: true,
    },
    source: {
      type: String,
      enum: ["website", "referral", "social", "other"],
      default: "website",
    },
  },
  { timestamps: true },
);

InternApplicationSchema.index({ email: 1, createdAt: -1 });
InternApplicationSchema.index({ discipline: 1, experience: 1 });

export const InternApplication = model<IInternApplication>(
  "InternApplication",
  InternApplicationSchema,
);
