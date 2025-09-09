import { Document, Schema, model, Types } from "mongoose";

export interface Module {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  course: Types.ObjectId;
  order: number;

  // Learning objectives
  learningObjectives: string[];

  // Duration (calculated from contents)
  estimatedDuration?: number; // in minutes

  // Access control
  isLocked: boolean;
  unlockConditions?: {
    requiredModules?: Types.ObjectId[];
    minimumProgress?: number; // percentage of previous modules to complete
    requiredQuizScore?: number;
  };

  // Completion requirements
  completionRequirements: {
    requireAllContents: boolean;
    requiredContentPercentage?: number; // if not all contents required
    requireQuizPass?: boolean;
    minimumQuizScore?: number;
  };

  // Analytics
  completionRate: number; // percentage of enrolled students who completed
  averageTimeToComplete?: number; // in hours

  // Status
  isActive: boolean;
  isPublished: boolean;

  // SEO
  slug?: string;

  // Organization
  category?: string;
  tags: string[];
}

export interface IModule extends Document {
  title: string;
  description?: string;
  course: Types.ObjectId;
  order: number;
  learningObjectives: string[];
  estimatedDuration?: number;
  isLocked: boolean;
  unlockConditions?: {
    requiredModules?: Types.ObjectId[];
    minimumProgress?: number;
    requiredQuizScore?: number;
  };
  completionRequirements: {
    requireAllContents: boolean;
    requiredContentPercentage?: number;
    requireQuizPass?: boolean;
    minimumQuizScore?: number;
  };
  completionRate: number;
  averageTimeToComplete?: number;
  isActive: boolean;
  isPublished: boolean;
  slug?: string;
  category?: string;
  tags: string[];

  // Virtual fields
  totalContents?: number;
  totalQuizzes?: number;
  totalResources?: number;

  // Methods
  getContents(): Promise<any[]>;
  getQuizzes(): Promise<any[]>;
  canUserAccess(userId: Types.ObjectId): Promise<boolean>;
  calculateProgress(userId: Types.ObjectId): Promise<number>;
  generateSlug(): void;
}

const ModuleSchema = new Schema<IModule>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    order: { type: Number, required: true, default: 0 },

    // Learning objectives
    learningObjectives: [{ type: String, trim: true }],

    // Duration
    estimatedDuration: { type: Number, min: 0 }, // minutes

    // Access control
    isLocked: { type: Boolean, default: false },
    unlockConditions: {
      requiredModules: [{ type: Schema.Types.ObjectId, ref: "Module" }],
      minimumProgress: { type: Number, min: 0, max: 100 },
      requiredQuizScore: { type: Number, min: 0, max: 100 },
    },

    // Completion requirements
    completionRequirements: {
      requireAllContents: { type: Boolean, default: true },
      requiredContentPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
      requireQuizPass: { type: Boolean, default: false },
      minimumQuizScore: { type: Number, min: 0, max: 100, default: 70 },
    },

    // Analytics
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    averageTimeToComplete: { type: Number, min: 0 }, // hours

    // Status
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },

    // SEO
    slug: { type: String, lowercase: true, trim: true },

    // Organization
    category: { type: String, trim: true },
    tags: [{ type: String, lowercase: true, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ModuleSchema.index({ course: 1, order: 1 });
ModuleSchema.index({ course: 1, isActive: 1, isPublished: 1 });
ModuleSchema.index({ slug: 1 }, { unique: true, sparse: true });
ModuleSchema.index({ tags: 1 });

// Text search
ModuleSchema.index({
  title: "text",
  description: "text",
  learningObjectives: "text",
  tags: "text",
});

// Virtual for total contents
ModuleSchema.virtual("totalContents", {
  ref: "Content",
  localField: "_id",
  foreignField: "module",
  count: true,
});

// Virtual for total quizzes
ModuleSchema.virtual("totalQuizzes", {
  ref: "Quiz",
  localField: "_id",
  foreignField: "module",
  count: true,
});

// Virtual for total resources
ModuleSchema.virtual("totalResources", {
  ref: "Resource",
  localField: "_id",
  foreignField: "module",
  count: true,
});

// Virtual for formatted duration
ModuleSchema.virtual("formattedDuration").get(function (this: IModule) {
  if (!this.estimatedDuration) return null;

  const hours = Math.floor(this.estimatedDuration / 60);
  const minutes = this.estimatedDuration % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Methods
ModuleSchema.methods.getContents = async function (this: IModule) {
  const Content = model("Content");
  return await Content.find({
    module: this._id,
    isActive: true,
  }).sort({ order: 1 });
};

ModuleSchema.methods.getQuizzes = async function (this: IModule) {
  const Quiz = model("Quiz");
  return await Quiz.find({
    module: this._id,
    isActive: true,
  }).sort({ order: 1 });
};

ModuleSchema.methods.canUserAccess = async function (
  this: IModule,
  userId: Types.ObjectId
) {
  // Check if module is locked and user meets unlock conditions
  if (!this.isLocked) return true;

  // Implementation would check enrollment and unlock conditions
  // This is a placeholder
  return true;
};

ModuleSchema.methods.calculateProgress = async function (
  this: IModule,
  userId: Types.ObjectId
) {
  // Calculate user's progress in this module
  // This would check completed contents, quizzes, etc.
  // Placeholder implementation
  return 0;
};

ModuleSchema.methods.generateSlug = function (this: IModule) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
};

// Pre-save middleware
ModuleSchema.pre("save", function (next) {
  // Generate slug if not provided
  this.generateSlug();

  // Validate completion requirements
  if (
    !this.completionRequirements.requireAllContents &&
    !this.completionRequirements.requiredContentPercentage
  ) {
    this.completionRequirements.requiredContentPercentage = 100;
  }

  next();
});

// Pre-remove middleware to handle cascading deletes
ModuleSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      // Delete associated contents, quizzes, and resources
      const Content = model("Content");
      const Quiz = model("Quiz");
      const Resource = model("Resource");

      await Promise.all([
        Content.deleteMany({ module: this._id }),
        Quiz.deleteMany({ module: this._id }),
        Resource.deleteMany({ module: this._id }),
      ]);

      next();
    } catch (error) {
      next(error as any);
    }
  }
);

export const Module = model<IModule>("Module", ModuleSchema);
