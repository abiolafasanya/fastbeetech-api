import mongoose, { Schema, Document, model, Types } from "mongoose";

export type CourseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all-levels";
export type CourseStatus = "draft" | "published" | "archived" | "coming-soon";
export type ContentType = "video" | "text" | "quiz" | "assignment" | "resource";
export type QuizType =
  | "multiple-choice"
  | "true-false"
  | "fill-blank"
  | "code-review";
export type EnrollmentStatus =
  | "enrolled"
  | "in-progress"
  | "completed"
  | "dropped";

// Quiz Question Interface
export interface QuizQuestion {
  _id?: Types.ObjectId;
  question: string;
  type: QuizType;
  options?: string[]; // for multiple-choice
  correctAnswer: string | string[]; // can be multiple for checkboxes
  explanation?: string;
  points: number;
  order: number;
}

// Quiz Interface
export interface CourseQuiz {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number; // in minutes
  passingScore: number; // percentage
  maxAttempts: number;
  showAnswers: boolean; // show correct answers after completion
  order: number;
  isRequired: boolean;
}

// Course Content/Lesson Interface
export interface CourseContent {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  type: ContentType;
  order: number;
  duration?: number; // in seconds for videos

  // Video content
  videoUrl?: string; // YouTube URL or other video source
  videoId?: string; // Extracted video ID
  transcript?: string;

  // Text content
  textContent?: string; // Markdown content

  // Quiz reference
  quiz?: CourseQuiz;

  // Resources/Downloads
  resources?: {
    title: string;
    url: string;
    type: "pdf" | "zip" | "link" | "other";
  }[];

  // Completion tracking
  isPreview: boolean; // can be viewed without enrollment
  isCompleted?: boolean; // for user progress (virtual field)
  completedAt?: Date;
}

// Course Module/Section Interface
export interface CourseModule {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  contents: CourseContent[];
  quiz?: CourseQuiz; // Module quiz
  estimatedDuration?: number; // total duration in seconds
}

// Course Enrollment Interface
export interface CourseEnrollment {
  user: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;
  progress: {
    completedContents: Types.ObjectId[];
    completedQuizzes: Types.ObjectId[];
    totalContents: number;
    totalQuizzes: number;
    progressPercentage: number;
    lastAccessedContent?: Types.ObjectId;
  };
  enrollmentDate: Date;
  completionDate?: Date;
  certificateIssued: boolean;
  certificateUrl?: string;

  // Quiz attempts and scores
  quizAttempts: {
    quiz: Types.ObjectId;
    attempts: {
      score: number;
      completedAt: Date;
      answers: Record<string, any>;
    }[];
  }[];

  // Course rating/review
  rating?: {
    stars: number; // 1-5
    review?: string;
    createdAt: Date;
  };
}

// Course Review Interface
export interface CourseReview {
  user: Types.ObjectId;
  course: Types.ObjectId;
  rating: number; // 1-5 stars
  review: string;
  helpful: number; // helpful votes
  helpfulByUsers: Types.ObjectId[];
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Main Course Interface
export interface CourseType {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  instructor: Types.ObjectId;
  coInstructors?: Types.ObjectId[];

  // Course metadata
  thumbnail: string;
  previewVideo?: string; // YouTube URL for course preview
  level: CourseLevel;
  status: CourseStatus;
  category: string;
  subcategory?: string;
  tags: string[];
  language: string;

  // Pricing
  price: number;
  originalPrice?: number; // for discounts
  currency: string;
  isFree: boolean;

  // Course structure
  modules: CourseModule[];
  totalDuration: number; // in seconds
  totalLessons: number;
  totalQuizzes: number;

  // Learning outcomes
  whatYouWillLearn: string[];
  prerequisites: string[];
  targetAudience: string[];

  // Course stats
  totalEnrollments: number;
  activeEnrollments: number;
  completionRate: number; // percentage
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };

  // Course settings
  allowComments: boolean;
  allowDownloads: boolean;
  certificate: boolean;
  certificateTemplate?: string;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;

  // Timestamps
  publishedAt?: Date;
  lastUpdated: Date;

  // Features
  isFeatured: boolean;
  isBestseller: boolean;
  isNew: boolean;
}

export interface ICourse extends CourseType, Document {
  _id: Types.ObjectId;
}
export interface ICourseEnrollment extends CourseEnrollment, Document {
  _id: Types.ObjectId;
}
export interface ICourseReview extends CourseReview, Document {
  _id: Types.ObjectId;
}

// Course Schema
const CourseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true, maxlength: 200 },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coInstructors: [{ type: Schema.Types.ObjectId, ref: "User" }],

    thumbnail: { type: String, required: true },
    previewVideo: { type: String },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all-levels"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "coming-soon"],
      default: "draft",
      index: true,
    },
    category: { type: String, required: true, index: true },
    subcategory: { type: String },
    tags: [{ type: String, lowercase: true, trim: true }],
    language: { type: String, default: "English" },

    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },
    isFree: { type: Boolean, default: false },

    modules: [
      {
        title: { type: String, required: true },
        description: { type: String },
        order: { type: Number, required: true },
        contents: [
          {
            title: { type: String, required: true },
            description: { type: String },
            type: {
              type: String,
              enum: ["video", "text", "quiz", "assignment", "resource"],
              required: true,
            },
            order: { type: Number, required: true },
            duration: { type: Number }, // seconds
            videoUrl: { type: String },
            videoId: { type: String },
            transcript: { type: String },
            textContent: { type: String },
            quiz: {
              title: { type: String },
              description: { type: String },
              questions: [
                {
                  question: { type: String, required: true },
                  type: {
                    type: String,
                    enum: [
                      "multiple-choice",
                      "true-false",
                      "fill-blank",
                      "code-review",
                    ],
                    required: true,
                  },
                  options: [{ type: String }],
                  correctAnswer: { type: Schema.Types.Mixed, required: true },
                  explanation: { type: String },
                  points: { type: Number, default: 1 },
                  order: { type: Number, required: true },
                },
              ],
              timeLimit: { type: Number }, // minutes
              passingScore: { type: Number, default: 70 },
              maxAttempts: { type: Number, default: 3 },
              showAnswers: { type: Boolean, default: true },
              order: { type: Number },
              isRequired: { type: Boolean, default: false },
            },
            resources: [
              {
                title: { type: String, required: true },
                url: { type: String, required: true },
                type: {
                  type: String,
                  enum: ["pdf", "zip", "link", "other"],
                  default: "link",
                },
              },
            ],
            isPreview: { type: Boolean, default: false },
          },
        ],
        quiz: {
          title: { type: String },
          description: { type: String },
          questions: [
            {
              question: { type: String, required: true },
              type: {
                type: String,
                enum: [
                  "multiple-choice",
                  "true-false",
                  "fill-blank",
                  "code-review",
                ],
                required: true,
              },
              options: [{ type: String }],
              correctAnswer: { type: Schema.Types.Mixed, required: true },
              explanation: { type: String },
              points: { type: Number, default: 1 },
              order: { type: Number, required: true },
            },
          ],
          timeLimit: { type: Number },
          passingScore: { type: Number, default: 70 },
          maxAttempts: { type: Number, default: 3 },
          showAnswers: { type: Boolean, default: true },
          order: { type: Number },
          isRequired: { type: Boolean, default: false },
        },
        estimatedDuration: { type: Number },
      },
    ],

    totalDuration: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },

    whatYouWillLearn: [{ type: String }],
    prerequisites: [{ type: String }],
    targetAudience: [{ type: String }],

    totalEnrollments: { type: Number, default: 0 },
    activeEnrollments: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    ratingDistribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 },
    },

    allowComments: { type: Boolean, default: true },
    allowDownloads: { type: Boolean, default: true },
    certificate: { type: Boolean, default: false },
    certificateTemplate: { type: String },

    metaTitle: { type: String },
    metaDescription: { type: String },
    ogImage: { type: String },

    publishedAt: { type: Date },
    lastUpdated: { type: Date, default: Date.now },

    isFeatured: { type: Boolean, default: false, index: true },
    isBestseller: { type: Boolean, default: false, index: true },
    isNew: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Course Enrollment Schema
const CourseEnrollmentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["enrolled", "in-progress", "completed", "dropped"],
      default: "enrolled",
      index: true,
    },
    progress: {
      completedContents: [{ type: Schema.Types.ObjectId }],
      completedQuizzes: [{ type: Schema.Types.ObjectId }],
      totalContents: { type: Number, default: 0 },
      totalQuizzes: { type: Number, default: 0 },
      progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
      lastAccessedContent: { type: Schema.Types.ObjectId },
    },
    enrollmentDate: { type: Date, default: Date.now },
    completionDate: { type: Date },
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String },

    quizAttempts: [
      {
        quiz: { type: Schema.Types.ObjectId, required: true },
        attempts: [
          {
            score: { type: Number, required: true, min: 0, max: 100 },
            completedAt: { type: Date, default: Date.now },
            answers: { type: Schema.Types.Mixed },
          },
        ],
      },
    ],

    rating: {
      stars: { type: Number, min: 1, max: 5 },
      review: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Course Review Schema
const CourseReviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true, minlength: 10, maxlength: 1000 },
    helpful: { type: Number, default: 0 },
    helpfulByUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate totals
CourseSchema.pre("save", function (this: ICourse, next) {
  if (this.modules) {
    let totalDuration = 0;
    let totalLessons = 0;
    let totalQuizzes = 0;

    this.modules.forEach((module: any) => {
      if (module.contents) {
        module.contents.forEach((content: any) => {
          if (content.type === "video" && content.duration) {
            totalDuration += content.duration;
          }
          if (content.type !== "quiz") {
            totalLessons++;
          }
          if (content.type === "quiz" || content.quiz) {
            totalQuizzes++;
          }
        });
      }
      if (module.quiz) {
        totalQuizzes++;
      }
    });

    this.totalDuration = totalDuration;
    this.totalLessons = totalLessons;
    this.totalQuizzes = totalQuizzes;
  }

  this.lastUpdated = new Date();
  next();
});

// Add indexes
// Ensure unique enrollment per user per course
CourseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

// Ensure unique review per user per course
CourseReviewSchema.index({ user: 1, course: 1 }, { unique: true });

// Additional indexes for performance
CourseReviewSchema.index({ course: 1, rating: -1 }); // for filtering by rating
CourseReviewSchema.index({ createdAt: -1 }); // for sorting by newest

export const Course = model<ICourse>("Course", CourseSchema);
export const CourseEnrollment = model<ICourseEnrollment>(
  "CourseEnrollment",
  CourseEnrollmentSchema
);
export const CourseReview = model<ICourseReview>(
  "CourseReview",
  CourseReviewSchema
);
