import { Schema, model, Types } from "mongoose";

const EmailLogSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: false },
    to: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed"], required: true },
    subject: { type: String },
    messageId: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

export const EmailLog = model("EmailLog", EmailLogSchema);
