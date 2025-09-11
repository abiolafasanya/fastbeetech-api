import { z } from "zod";

// Quiz Question Validation
const quizQuestionSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  type: z.enum(["multiple-choice", "true-false", "fill-blank", "code-review"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().optional(),
  points: z.number().min(1).default(1),
  order: z.number().min(0),
});

// Quiz Validation
const quizSchema = z.object({
  title: z.string().min(3, "Quiz title must be at least 3 characters"),
  description: z.string().optional(),
  questions: z
    .array(quizQuestionSchema)
    .min(1, "Quiz must have at least 1 question"),
  timeLimit: z.number().min(1).optional(), // minutes
  passingScore: z.number().min(0).max(100).default(70),
  maxAttempts: z.number().min(1).default(3),
  showAnswers: z.boolean().default(true),
  order: z.number().min(0).optional(),
  isRequired: z.boolean().default(false),
});

// Course Content Validation
const courseContentSchema = z.object({
  title: z.string().min(3, "Content title must be at least 3 characters"),
  description: z.string().optional(),
  type: z.enum(["video", "text", "quiz", "assignment", "resource"]),
  order: z.number().min(0),
  duration: z.number().min(0).optional(), // seconds
  videoUrl: z.string().url().optional(),
  videoId: z.string().optional(),
  transcript: z.string().optional(),
  textContent: z.string().optional(),
  quiz: quizSchema.optional(),
  resources: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
        type: z.enum(["pdf", "zip", "link", "other"]).default("link"),
      })
    )
    .optional(),
  isPreview: z.boolean().default(false),
});

// Course Module Validation
const courseModuleSchema = z.object({
  title: z.string().min(3, "Module title must be at least 3 characters"),
  description: z.string().optional(),
  order: z.number().min(0),
  contents: z
    .array(courseContentSchema)
    .min(1, "Module must have at least 1 content item"),
  quiz: quizSchema.optional(),
  estimatedDuration: z.number().min(0).optional(),
});

// Create Course Validation
export const createCourseSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters"),
  slug: z
    .string()
    .min(3)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  description: z.string().min(50, "Description must be at least 50 characters"),
  shortDescription: z
    .string()
    .min(20)
    .max(200, "Short description must be between 20-200 characters"),

  thumbnail: z.string().url("Thumbnail must be a valid URL"),
  previewVideo: z.string().url().optional(),
  level: z.enum(["beginner", "intermediate", "advanced", "all-levels"]),
  status: z
    .enum(["draft", "published", "archived", "coming-soon"])
    .default("draft"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  tags: z.array(z.string().min(1)).default([]),
  language: z.string().default("English"),

  price: z.number().min(0, "Price must be 0 or greater"),
  originalPrice: z.number().min(0).optional(),
  currency: z.string().default("USD"),
  isFree: z.boolean().default(false),

  modules: z
    .array(courseModuleSchema)
    .min(1, "Course must have at least 1 module"),

  whatYouWillLearn: z
    .array(z.string().min(1))
    .min(1, "Must specify at least 1 learning outcome"),
  prerequisites: z.array(z.string().min(1)).default([]),
  targetAudience: z
    .array(z.string().min(1))
    .min(1, "Must specify target audience"),

  allowComments: z.boolean().default(true),
  allowDownloads: z.boolean().default(true),
  certificate: z.boolean().default(false),
  certificateTemplate: z.string().optional(),

  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(300).optional(),
  ogImage: z.string().url().optional(),

  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNew: z.boolean().default(true),
});

// Update Course Validation (partial)
export const updateCourseSchema = createCourseSchema.partial();

// Course Enrollment Validation
export const enrollCourseSchema = z.object({
  courseId: z.string().length(24, "Invalid course ID"),
});

// Progress Update Validation
export const updateProgressSchema = z.object({
  contentId: z.string().length(24, "Invalid content ID"),
  completed: z.boolean().default(true),
  duration: z.number().min(0).optional(), // time spent on content
});

// Quiz Attempt Validation
export const quizAttemptSchema = z.object({
  quizId: z.string().length(24, "Invalid quiz ID"),
  answers: z.record(z.string(), z.any()), // flexible answers object
});

// Course Review Validation
export const courseReviewSchema = z.object({
  rating: z.number().min(1).max(5, "Rating must be between 1-5 stars"),
  review: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(1000, "Review cannot exceed 1000 characters"),
});

// Mark Review Helpful Validation
export const markHelpfulSchema = z.object({
  reviewId: z.string().length(24, "Invalid review ID"),
  helpful: z.boolean(),
});

// Course Search/Filter Validation
export const courseSearchSchema = z.object({
  page: z.string().or(z.number().min(1).default(1)).optional(),
  limit: z.number().min(1).max(50).default(12).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  level: z
    .enum(["beginner", "intermediate", "advanced", "all-levels"])
    .optional(),
  price: z.enum(["free", "paid", "all"]).optional(),
  rating: z.number().min(1).max(5).optional(), // minimum rating
  sortBy: z
    .enum([
      "newest",
      "oldest",
      "price-low",
      "price-high",
      "rating",
      "popular",
      "trending",
    ])
    .default("newest"),
  instructor: z.string().length(24).optional(),
  tags: z.array(z.string()).optional(),
  duration: z.enum(["short", "medium", "long"]).optional(), // 0-2h, 2-6h, 6h+
  language: z.string().optional(),
  featured: z.boolean().optional(),
  bestseller: z.boolean().optional(),
});

// Course Analytics Validation
export const courseAnalyticsSchema = z.object({
  courseId: z.string().length(24, "Invalid course ID"),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

// Bulk Operations Validation
export const bulkCourseUpdateSchema = z.object({
  courseIds: z
    .array(z.string().length(24))
    .min(1, "Must select at least 1 course"),
  operation: z.enum([
    "publish",
    "unpublish",
    "archive",
    "delete",
    "feature",
    "unfeature",
  ]),
  value: z.any().optional(), // for operations that need additional data
});

// Export type definitions
export type ICreateCourse = z.infer<typeof createCourseSchema>;
export type IUpdateCourse = z.infer<typeof updateCourseSchema>;
export type IEnrollCourse = z.infer<typeof enrollCourseSchema>;
export type IUpdateProgress = z.infer<typeof updateProgressSchema>;
export type IQuizAttempt = z.infer<typeof quizAttemptSchema>;
export type ICourseReview = z.infer<typeof courseReviewSchema>;
export type IMarkHelpful = z.infer<typeof markHelpfulSchema>;
export type ICourseSearch = z.infer<typeof courseSearchSchema>;
export type ICourseAnalytics = z.infer<typeof courseAnalyticsSchema>;
export type IBulkCourseUpdate = z.infer<typeof bulkCourseUpdateSchema>;

// Export individual schemas for reuse
export {
  quizQuestionSchema,
  quizSchema,
  courseContentSchema,
  courseModuleSchema,
};

export default createCourseSchema;
