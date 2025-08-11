import mongoose, { Schema, Document, model, Types } from "mongoose";

export interface BlogPostType {
  title: string;
  slug: string;
  content: string;
  author: Types.ObjectId; // linked to User
  excerpt?: string;
  cover?: string;
  tags?: string[];
  status: "draft" | "published";
  publishedAt?: Date;

  // Engagement
  likes: number;
  views: number;

  // Flags
  isFeatured: boolean;
}

export interface IBlogPost extends BlogPostType, Document {}

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
    tags: [{ type: String, trim: true }],

    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date },

    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes for sorting/filtering
BlogPostSchema.index({ slug: 1 });
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ isFeatured: 1 });
BlogPostSchema.index({ likes: -1 });
BlogPostSchema.index({ views: -1 });

export const BlogPost = model<IBlogPost>("Blog", BlogPostSchema);
