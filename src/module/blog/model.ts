// blog/model.ts
import mongoose, { Schema, Document, model, Types } from "mongoose";

export type BlogStatus = "draft" | "scheduled" | "published" | "archived";

export interface BlogComment {
  _id?: Types.ObjectId;
  author: Types.ObjectId | null; // null for guest
  authorName?: string; // store snapshot for guest
  authorEmail?: string; // optional for gravatar/moderation
  content: string;
  status: "approved" | "pending" | "spam" | "deleted";
  likes: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogPostType {
  title: string;
  slug: string;
  content: string; // MD/MDX or HTML
  author: Types.ObjectId;
  excerpt?: string;
  cover?: string;
  tags?: string[];
  status: BlogStatus;
  publishedAt?: Date;
  scheduledFor?: Date;

  // Engagement
  likes: number;
  views: number;

  // Flags
  isFeatured: boolean;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonical?: string;

  // Computed
  readingTime?: number; // minutes (rounded)
  wordCount?: number;

  // Comments
  allowComments: boolean;
  comments: BlogComment[];

  // Soft delete
  isDeleted: boolean;
}

export interface IBlogPost extends BlogPostType, Document {}

const CommentSchema = new Schema<BlogComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, trim: true },
    authorEmail: { type: String, trim: true, lowercase: true },
    content: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["approved", "pending", "spam", "deleted"],
      default: "pending",
    },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },

    excerpt: { type: String, trim: true },
    cover: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],

    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
    },
    publishedAt: { type: Date },
    scheduledFor: { type: Date },

    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },

    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    ogImage: { type: String, trim: true },
    canonical: { type: String, trim: true },

    readingTime: { type: Number },
    wordCount: { type: Number },

    allowComments: { type: Boolean, default: true },
    comments: [CommentSchema],

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ---- Indexes ----
// BlogPostSchema.index({ slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ isFeatured: 1 });
BlogPostSchema.index({ likes: -1, views: -1 });
BlogPostSchema.index({ tags: 1 });
BlogPostSchema.index({ title: "text", excerpt: "text", tags: "text" });

// ---- Helpers ----
function estimateReadingTime(text: string) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200)); // ~200wpm
  return { words, minutes };
}

BlogPostSchema.pre("save", function (next) {
  if (this.isModified("content")) {
    const { words, minutes } = estimateReadingTime(this.content);
    this.wordCount = words;
    this.readingTime = minutes;
  }
  // if scheduled in the past -> publish now
  if (
    this.status === "scheduled" &&
    this.scheduledFor &&
    this.scheduledFor <= new Date()
  ) {
    this.status = "published";
    this.publishedAt = new Date();
  }
  next();
});

export const BlogPost = model<IBlogPost>("Blog", BlogPostSchema);
