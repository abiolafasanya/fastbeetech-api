import { Document, Schema, model, Types } from "mongoose";

// Course enums (keeping the same as before)
export type CourseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all-levels";
export type CourseStatus = "draft" | "published" | "archived" | "coming-soon";
export type EnrollmentStatus =
  | "enrolled"
  | "in-progress"
  | "completed"
  | "dropped";

// Simplified Course Interface (no nested structures)
export interface Course {
  _id?: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  instructor: Types.ObjectId;
  coInstructors?: Types.ObjectId[];

  // Course metadata
  thumbnail: string;
  previewVideo?: string;
  level: CourseLevel;
  status: CourseStatus;
  category: string;
  subcategory?: string;
  tags: string[];
  language: string;

  // Pricing
  price: number;
  originalPrice?: number;
  currency: string;
  isFree: boolean;

  // Course structure - now calculated from separate collections
  totalDuration: number; // calculated from contents
  totalLessons: number; // calculated from contents
  totalQuizzes: number; // calculated from quizzes
  totalModules: number; // calculated from modules

  // Learning outcomes
  whatYouWillLearn: string[];
  prerequisites: string[];
  targetAudience: string[];

  // Course stats
  totalEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
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

  // Course difficulty and requirements
  estimatedHours?: number;
  skillLevel?: string;

  // Course analytics
  conversionRate?: number; // from preview to enrollment
  refundRate?: number;

  // Course access
  hasLifetimeAccess: boolean;
  accessDuration?: number; // days (if not lifetime)

  // Course support
  hasQASupport: boolean;
  hasCommunity: boolean;
  hasAssignments: boolean;

  // Monetization
  affiliateCommission?: number; // percentage
  couponCodes?: string[];
}

// Course Enrollment Interface (simplified)
export interface CourseEnrollment {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;

  // Progress tracking - now references separate collections
  progress: {
    completedContents: Types.ObjectId[];
    completedModules: Types.ObjectId[];
    completedQuizzes: Types.ObjectId[];
    totalContents: number;
    totalModules: number;
    totalQuizzes: number;
    progressPercentage: number;
    lastAccessedContent?: Types.ObjectId;
    lastAccessedAt: Date;
    currentModule?: Types.ObjectId;
  };

  enrollmentDate: Date;
  startDate?: Date;
  completionDate?: Date;
  expirationDate?: Date;

  // Certificates
  certificateIssued: boolean;
  certificateUrl?: string;
  certificateData?: {
    completionScore: number;
    completionTime: number; // hours
    grade?: string;
    issuedAt: Date;
  };

  // Payment info
  paymentAmount?: number;
  paymentMethod?: string;
  transactionId?: string;

  // Course rating/review
  rating?: {
    stars: number; // 1-5
    review?: string;
    createdAt: Date;
    isPublic: boolean;
  };

  // Learning preferences
  preferences?: {
    playbackSpeed: number;
    subtitlesEnabled: boolean;
    reminderFrequency: "daily" | "weekly" | "none";
  };
}

// Course Review Interface (separate collection)
export interface CourseReview {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  rating: number; // 1-5 stars
  review: string;
  helpful: number; // helpful votes
  helpfulByUsers: Types.ObjectId[];
  isVerifiedPurchase: boolean;
  isPublic: boolean;
  moderationStatus: "pending" | "approved" | "rejected";
  moderationNotes?: string;

  // Review metadata
  reviewLength: number;
  sentiment?: "positive" | "neutral" | "negative";
  topics?: string[]; // extracted topics from review
}

// Document interfaces
export interface ICourse extends Omit<Course, "_id">, Document {
  // Methods
  calculateTotals(): Promise<void>;
  getModules(): Promise<any[]>;
  getEnrollmentCount(): Promise<number>;
  updateRating(): Promise<void>;
  canUserEnroll(userId: Types.ObjectId): Promise<boolean>;
}

export interface ICourseEnrollment
  extends Omit<CourseEnrollment, "_id">,
    Document {}
export interface ICourseReview extends Omit<CourseReview, "_id">, Document {
  review: string;
  reviewLength: number;
}

// Course Schema (much simpler now)
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

    // Calculated fields (updated via methods)
    totalDuration: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    totalModules: { type: Number, default: 0 },

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
    isNew: { type: Boolean, default: true, index: true },

    // Additional fields
    estimatedHours: { type: Number, min: 0 },
    skillLevel: { type: String },
    conversionRate: { type: Number, min: 0, max: 100 },
    refundRate: { type: Number, min: 0, max: 100 },
    hasLifetimeAccess: { type: Boolean, default: true },
    accessDuration: { type: Number, min: 0 }, // days
    hasQASupport: { type: Boolean, default: true },
    hasCommunity: { type: Boolean, default: false },
    hasAssignments: { type: Boolean, default: false },
    affiliateCommission: { type: Number, min: 0, max: 100 },
    couponCodes: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Course Enrollment Schema
const CourseEnrollmentSchema = new Schema<ICourseEnrollment>(
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
      completedContents: [{ type: Schema.Types.ObjectId, ref: "Content" }],
      completedModules: [{ type: Schema.Types.ObjectId, ref: "Module" }],
      completedQuizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
      totalContents: { type: Number, default: 0 },
      totalModules: { type: Number, default: 0 },
      totalQuizzes: { type: Number, default: 0 },
      progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
      lastAccessedContent: { type: Schema.Types.ObjectId, ref: "Content" },
      lastAccessedAt: { type: Date, default: Date.now },
      currentModule: { type: Schema.Types.ObjectId, ref: "Module" },
    },
    enrollmentDate: { type: Date, default: Date.now },
    startDate: { type: Date },
    completionDate: { type: Date },
    expirationDate: { type: Date },

    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String },
    certificateData: {
      completionScore: { type: Number, min: 0, max: 100 },
      completionTime: { type: Number, min: 0 }, // hours
      grade: { type: String },
      issuedAt: { type: Date },
    },

    paymentAmount: { type: Number, min: 0 },
    paymentMethod: { type: String },
    transactionId: { type: String },

    rating: {
      stars: { type: Number, min: 1, max: 5 },
      review: { type: String },
      createdAt: { type: Date, default: Date.now },
      isPublic: { type: Boolean, default: true },
    },

    preferences: {
      playbackSpeed: { type: Number, default: 1.0, min: 0.5, max: 3.0 },
      subtitlesEnabled: { type: Boolean, default: false },
      reminderFrequency: {
        type: String,
        enum: ["daily", "weekly", "none"],
        default: "weekly",
      },
    },
  },
  {
    timestamps: true,
  }
);

// CourseEnrollment indexes
CourseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

// Course Review Schema
const CourseReviewSchema = new Schema<ICourseReview>(
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
    isPublic: { type: Boolean, default: true },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    moderationNotes: { type: String },

    reviewLength: { type: Number },
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
    },
    topics: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// CourseReview indexes
CourseReviewSchema.index({ user: 1, course: 1 }, { unique: true });
CourseReviewSchema.index({ course: 1, rating: -1 }); // for filtering by rating
CourseReviewSchema.index({ createdAt: -1 }); // for sorting by newest
CourseReviewSchema.index({ moderationStatus: 1 }); // for moderation queue

// Additional indexes
CourseSchema.index({ title: "text", description: "text", tags: "text" });
CourseSchema.index({ price: 1, isFree: 1 });
CourseSchema.index({ level: 1, category: 1 });
CourseSchema.index({ averageRating: -1, totalReviews: -1 });

// Virtual for modules
CourseSchema.virtual("modules", {
  ref: "Module",
  localField: "_id",
  foreignField: "course",
});

// Methods
CourseSchema.methods.calculateTotals = async function (this: ICourse) {
  const Module = model("Module");
  const Content = model("Content");
  const Quiz = model("Quiz");

  // Get totals from separate collections
  const [moduleCount, contentStats, quizCount] = await Promise.all([
    Module.countDocuments({ course: this._id, isActive: true }),
    Content.aggregate([
      { $match: { course: this._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalContents: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
        },
      },
    ]),
    Quiz.countDocuments({ course: this._id, isActive: true }),
  ]);

  this.totalModules = moduleCount;
  this.totalLessons = contentStats[0]?.totalContents || 0;
  this.totalDuration = contentStats[0]?.totalDuration || 0;
  this.totalQuizzes = quizCount;

  this.lastUpdated = new Date();
  await this.save();
};

CourseSchema.methods.getModules = async function (this: ICourse) {
  const Module = model("Module");
  return await Module.find({
    course: this._id,
    isActive: true,
  }).sort({ order: 1 });
};

CourseSchema.methods.getEnrollmentCount = async function (this: ICourse) {
  const CourseEnrollment = model("CourseEnrollment");
  return await CourseEnrollment.countDocuments({
    course: this._id,
    status: { $in: ["enrolled", "in-progress", "completed"] },
  });
};

CourseSchema.methods.updateRating = async function (this: ICourse) {
  const CourseReview = model("CourseReview");

  const ratingStats = await CourseReview.aggregate([
    { $match: { course: this._id, moderationStatus: "approved" } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        ratingCounts: {
          $push: "$rating",
        },
      },
    },
  ]);

  if (ratingStats.length > 0) {
    const stats = ratingStats[0];
    this.averageRating = Math.round(stats.avgRating * 10) / 10;
    this.totalReviews = stats.totalReviews;

    // Update rating distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats.ratingCounts.forEach((rating: number) => {
      distribution[rating as keyof typeof distribution]++;
    });
    this.ratingDistribution = distribution;
  }

  await this.save();
};

CourseSchema.methods.canUserEnroll = async function (
  this: ICourse,
  userId: Types.ObjectId
) {
  // Check if course is published
  if (this.status !== "published") return false;

  // Check if user is already enrolled
  const CourseEnrollment = model("CourseEnrollment");
  const existingEnrollment = await CourseEnrollment.findOne({
    user: userId,
    course: this._id,
    status: { $in: ["enrolled", "in-progress", "completed"] },
  });

  return !existingEnrollment;
};

// Pre-save middleware for reviews
CourseReviewSchema.pre("save", function (this: ICourseReview, next) {
  if (this.review) {
    this.reviewLength = this.review.length;
  }
  next();
});

export const Course = model<ICourse>("Course", CourseSchema);
export const CourseEnrollment = model<ICourseEnrollment>(
  "CourseEnrollment",
  CourseEnrollmentSchema
);
export const CourseReview = model<ICourseReview>(
  "CourseReview",
  CourseReviewSchema
);
