// models/postEvent.ts
import { Schema, model, Types } from "mongoose";
export type EventType =
  | "view"
  | "like"
  | "share"
  | "read_start"
  | "read_complete";

const PostEventSchema = new Schema(
  {
    postId: {
      type: Types.ObjectId,
      ref: "BlogPost",
      index: true,
      required: true,
    },
    type: {
      type: String,
      enum: ["view", "like", "share", "read_start", "read_complete"],
      index: true,
    },
    userId: { type: Types.ObjectId, ref: "User", default: null },
    sessionId: { type: String, index: true }, // anon tracking
    ua: String,
    ip: String,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export const PostEvent = model("PostEvent", PostEventSchema);

// models/postDailyStats.ts
const PostDailyStatsSchema = new Schema(
  {
    postId: { type: Types.ObjectId, ref: "BlogPost", index: true },
    date: { type: String, index: true }, // "YYYY-MM-DD"
    views: { type: Number, default: 0 },
    reads: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
  },
  { versionKey: false }
);

PostDailyStatsSchema.index({ postId: 1, date: 1 }, { unique: true });
export const PostDailyStats = model("PostDailyStats", PostDailyStatsSchema);
