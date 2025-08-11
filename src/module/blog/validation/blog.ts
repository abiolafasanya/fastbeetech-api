import { z } from "zod";

export const createPostSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters long")
    .max(200, "Title must not exceed 200 characters"),

  content: z.string().min(10, "Content must be at least 10 characters long"),

  excerpt: z
    .string()
    .min(10, "Excerpt must be at least 10 characters")
    .max(300, "Excerpt must not exceed 300 characters"),

  tags: z
    .array(z.string().min(1, "Tag cannot be empty"))
    .min(1, "At least one tag is required"),

  cover: z.url("Cover must be a valid URL"),

  authorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid author ID"),

  likes: z.number().int().nonnegative().default(0),

  featured: z.boolean().default(false),

  trending: z.boolean().default(false),

  publishedAt: z
    .date()
    .optional()
    .or(z.iso.datetime({ offset: true })),

  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type ICreatePost = z.infer<typeof createPostSchema>;
export default createPostSchema; // export the schema
