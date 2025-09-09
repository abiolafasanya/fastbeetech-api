import { Document, Schema, model, Types } from "mongoose";

export type ContentType =
  | "video"
  | "text"
  | "quiz"
  | "assignment"
  | "resource"
  | "live-session"
  | "discussion";

export interface Content {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  type: ContentType;
  course: Types.ObjectId;
  module: Types.ObjectId;
  order: number;

  // Duration
  duration?: number; // seconds for video content
  estimatedReadTime?: number; // minutes for text content

  // Video-specific fields
  videoUrl?: string;
  videoId?: string; // extracted ID for platforms like YouTube
  videoProvider?: "youtube" | "vimeo" | "aws" | "local";
  transcript?: string;
  thumbnailUrl?: string;
  videoQuality?: string[];

  // Text-specific fields
  textContent?: string; // Markdown or HTML content

  // Assignment-specific fields
  assignmentInstructions?: string;
  submissionFormat?: string[]; // ["pdf", "doc", "zip"]
  maxFileSize?: number; // in MB
  dueDate?: Date;
  gradingRubric?: {
    criteria: string;
    maxPoints: number;
    description: string;
  }[];

  // Live session fields
  sessionDate?: Date;
  sessionDuration?: number; // minutes
  meetingUrl?: string;
  recordingUrl?: string;

  // Access control
  isPreview: boolean; // can be viewed without enrollment
  isLocked: boolean;
  unlockConditions?: {
    requiredContents?: Types.ObjectId[];
    requiredQuizScore?: number;
    requiredQuizzes?: Types.ObjectId[];
  };

  // Resources (references to Resource collection)
  resources: Types.ObjectId[];

  // Quiz reference (if content type is quiz)
  quiz?: Types.ObjectId;

  // Discussion settings
  allowComments: boolean;
  discussionThread?: Types.ObjectId;

  // Analytics
  totalViews: number;
  averageWatchTime?: number; // for videos
  completionRate: number;

  // Status
  isActive: boolean;
  isPublished: boolean;

  // SEO
  slug?: string;
  metaDescription?: string;
}

export interface IContent extends Document {
  title: string;
  description?: string;
  type: ContentType;
  course: Types.ObjectId;
  module: Types.ObjectId;
  order: number;
  duration?: number;
  estimatedReadTime?: number;
  videoUrl?: string;
  videoId?: string;
  videoProvider?: "youtube" | "vimeo" | "aws" | "local";
  transcript?: string;
  thumbnailUrl?: string;
  videoQuality?: string[];
  textContent?: string;
  assignmentInstructions?: string;
  submissionFormat?: string[];
  maxFileSize?: number;
  dueDate?: Date;
  gradingRubric?: {
    criteria: string;
    maxPoints: number;
    description: string;
  }[];
  sessionDate?: Date;
  sessionDuration?: number;
  meetingUrl?: string;
  recordingUrl?: string;
  isPreview: boolean;
  isLocked: boolean;
  unlockConditions?: {
    requiredContents?: Types.ObjectId[];
    requiredQuizScore?: number;
    requiredQuizzes?: Types.ObjectId[];
  };
  resources: Types.ObjectId[];
  quiz?: Types.ObjectId;
  allowComments: boolean;
  discussionThread?: Types.ObjectId;
  totalViews: number;
  averageWatchTime?: number;
  completionRate: number;
  isActive: boolean;
  isPublished: boolean;
  slug?: string;
  metaDescription?: string;

  // Methods
  incrementViewCount(): Promise<IContent>;
  canUserAccess(userId: Types.ObjectId): Promise<boolean>;
  getResourcesWithDetails(): Promise<any[]>;
  generateSlug(): void;
}

const ContentSchema = new Schema<IContent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        "video",
        "text",
        "quiz",
        "assignment",
        "resource",
        "live-session",
        "discussion",
      ],
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    order: { type: Number, required: true, default: 0 },

    // Duration
    duration: { type: Number, min: 0 }, // seconds
    estimatedReadTime: { type: Number, min: 0 }, // minutes

    // Video-specific fields
    videoUrl: { type: String, trim: true },
    videoId: { type: String, trim: true },
    videoProvider: {
      type: String,
      enum: ["youtube", "vimeo", "aws", "local"],
    },
    transcript: { type: String },
    thumbnailUrl: { type: String, trim: true },
    videoQuality: [{ type: String }],

    // Text-specific fields
    textContent: { type: String }, // Markdown or HTML

    // Assignment-specific fields
    assignmentInstructions: { type: String },
    submissionFormat: [{ type: String }], // file types allowed
    maxFileSize: { type: Number, min: 0 }, // MB
    dueDate: { type: Date },
    gradingRubric: [
      {
        criteria: { type: String, required: true },
        maxPoints: { type: Number, required: true, min: 0 },
        description: { type: String },
      },
    ],

    // Live session fields
    sessionDate: { type: Date },
    sessionDuration: { type: Number, min: 0 }, // minutes
    meetingUrl: { type: String, trim: true },
    recordingUrl: { type: String, trim: true },

    // Access control
    isPreview: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    unlockConditions: {
      requiredContents: [{ type: Schema.Types.ObjectId, ref: "Content" }],
      requiredQuizScore: { type: Number, min: 0, max: 100 },
      requiredQuizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
    },

    // Resources references
    resources: [{ type: Schema.Types.ObjectId, ref: "Resource" }],

    // Quiz reference
    quiz: { type: Schema.Types.ObjectId, ref: "Quiz" },

    // Discussion settings
    allowComments: { type: Boolean, default: true },
    discussionThread: { type: Schema.Types.ObjectId },

    // Analytics
    totalViews: { type: Number, default: 0, min: 0 },
    averageWatchTime: { type: Number, min: 0 }, // seconds for videos
    completionRate: { type: Number, default: 0, min: 0, max: 100 },

    // Status
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },

    // SEO
    slug: { type: String, lowercase: true, trim: true },
    metaDescription: { type: String, maxlength: 160 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ContentSchema.index({ course: 1, module: 1, order: 1 });
ContentSchema.index({ type: 1, isActive: 1, isPublished: 1 });
ContentSchema.index({ slug: 1 }, { unique: true, sparse: true });
ContentSchema.index({ sessionDate: 1 }); // for live sessions
ContentSchema.index({ dueDate: 1 }); // for assignments

// Text search
ContentSchema.index({
  title: "text",
  description: "text",
  textContent: "text",
});

// Virtual for content icon based on type
ContentSchema.virtual("icon").get(function (this: IContent) {
  const iconMap: Record<ContentType, string> = {
    video: "🎥",
    text: "📝",
    quiz: "❓",
    assignment: "📋",
    resource: "📎",
    "live-session": "🔴",
    discussion: "💬",
  };
  return iconMap[this.type] || "📄";
});

// Virtual for estimated completion time
ContentSchema.virtual("estimatedCompletionTime").get(function (this: IContent) {
  switch (this.type) {
    case "video":
      return this.duration ? Math.ceil(this.duration / 60) : 0; // convert to minutes
    case "text":
      return this.estimatedReadTime || 5; // default 5 minutes
    case "quiz":
      return 10; // default 10 minutes for quiz
    case "assignment":
      return 60; // default 1 hour for assignment
    default:
      return 5;
  }
});

// Virtual for formatted duration
ContentSchema.virtual("formattedDuration").get(function (this: IContent) {
  if (!this.duration) return null;

  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Methods
ContentSchema.methods.incrementViewCount = function (this: IContent) {
  this.totalViews += 1;
  return this.save();
};

ContentSchema.methods.canUserAccess = async function (
  this: IContent,
  userId: Types.ObjectId
) {
  // Check if content is locked and user meets unlock conditions
  if (!this.isLocked) return true;
  if (this.isPreview) return true;

  // Implementation would check enrollment and unlock conditions
  return true; // Placeholder
};

ContentSchema.methods.getResourcesWithDetails = async function (
  this: IContent
) {
  await this.populate("resources");
  return this.resources;
};

ContentSchema.methods.generateSlug = function (this: IContent) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
};

// Pre-save middleware
ContentSchema.pre("save", function (next) {
  // Generate slug if not provided
  this.generateSlug();

  // Validate video URL and extract ID
  if (this.type === "video" && this.videoUrl) {
    if (
      this.videoUrl.includes("youtube.com") ||
      this.videoUrl.includes("youtu.be")
    ) {
      const match = this.videoUrl.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
      );
      if (match) {
        this.videoId = match[1];
        this.videoProvider = "youtube";
      }
    } else if (this.videoUrl.includes("vimeo.com")) {
      const match = this.videoUrl.match(/vimeo\.com\/(\d+)/);
      if (match) {
        this.videoId = match[1];
        this.videoProvider = "vimeo";
      }
    }
  }

  // Set estimated read time for text content
  if (this.type === "text" && this.textContent && !this.estimatedReadTime) {
    const wordCount = this.textContent.split(/\s+/).length;
    this.estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute
  }

  next();
});

export const Content = model<IContent>("Content", ContentSchema);
