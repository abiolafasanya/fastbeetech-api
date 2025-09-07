import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  content: z.string().min(20),
  // author: z.string().length(24),
  excerpt: z.string().max(500).optional(),
  cover: z.url().optional(),
  tags: z.array(z.string().min(1)).optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  scheduledFor: z.coerce.date().optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(300).optional(),
  ogImage: z.url().optional(),
  canonical: z.url().or(z.string()).optional().default(""),
  allowComments: z.boolean().optional(),
});

export const updatePostSchema = createPostSchema.partial();

export const commentSchema = z.object({
  author: z.string().length(24).nullable().optional(),
  authorName: z.string().min(2).max(80).optional(),
  authorEmail: z.string().email().optional(),
  content: z.string().min(2),
});

export type ICreatePost = z.infer<typeof createPostSchema>;
export default createPostSchema; // export the schema
