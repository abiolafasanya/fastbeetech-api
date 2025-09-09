import { Document, Schema, model, Types } from "mongoose";

export interface Quiz {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  course: Types.ObjectId;
  module?: Types.ObjectId; // null if course-level quiz
  content?: Types.ObjectId; // null if module/course-level quiz

  // Questions (references to Question documents)
  questions: {
    question: Types.ObjectId;
    order: number;
    weight?: number; // if some questions are worth more points
  }[];

  // Quiz settings
  timeLimit?: number; // minutes
  passingScore: number; // percentage
  maxAttempts: number;
  showAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showProgress: boolean;
  allowReview: boolean;
  allowSkip: boolean;

  // Scheduling
  availableFrom?: Date;
  availableUntil?: Date;

  // Grading
  autoGrade: boolean;
  immediateResults: boolean;
  gradingMethod: "highest" | "latest" | "average"; // how to calculate final score from multiple attempts

  // Access control
  order: number;
  isRequired: boolean;
  weight?: number; // for course grading

  // Prerequisites
  prerequisites?: {
    requiredContents?: Types.ObjectId[];
    requiredQuizzes?: Types.ObjectId[];
    minimumScore?: number;
  };

  // Analytics
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;

  // Status
  isActive: boolean;
  isPublished: boolean;

  // Instructions
  instructions?: string;

  // Security
  preventCheating: {
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    disableRightClick: boolean;
    lockdownBrowser: boolean;
    webcamRequired: boolean;
  };
}

export interface IQuiz extends Document {
  title: string;
  description?: string;
  course: Types.ObjectId;
  module?: Types.ObjectId;
  content?: Types.ObjectId;
  questions: {
    question: Types.ObjectId;
    order: number;
    weight?: number;
  }[];
  timeLimit?: number;
  passingScore: number;
  maxAttempts: number;
  showAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showProgress: boolean;
  allowReview: boolean;
  allowSkip: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  autoGrade: boolean;
  immediateResults: boolean;
  gradingMethod: "highest" | "latest" | "average";
  order: number;
  isRequired: boolean;
  weight?: number;
  prerequisites?: {
    requiredContents?: Types.ObjectId[];
    requiredQuizzes?: Types.ObjectId[];
    minimumScore?: number;
  };
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  isActive: boolean;
  isPublished: boolean;
  instructions?: string;
  preventCheating: {
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    disableRightClick: boolean;
    lockdownBrowser: boolean;
    webcamRequired: boolean;
  };

  // Methods
  calculateTotalPoints(): number;
  getQuestionsWithDetails(): Promise<any[]>;
  canUserAttempt(userId: Types.ObjectId): Promise<boolean>;
  updateAnalytics(): Promise<IQuiz>;
}

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      index: true,
    },
    content: {
      type: Schema.Types.ObjectId,
      ref: "Content",
      index: true,
    },

    questions: [
      {
        question: {
          type: Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        order: { type: Number, required: true },
        weight: { type: Number, default: 1, min: 0 },
      },
    ],

    // Quiz settings
    timeLimit: { type: Number, min: 0 }, // minutes
    passingScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 70,
    },
    maxAttempts: { type: Number, required: true, min: 1, default: 3 },
    showAnswers: { type: Boolean, default: true },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showProgress: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true },
    allowSkip: { type: Boolean, default: false },

    // Scheduling
    availableFrom: { type: Date },
    availableUntil: { type: Date },

    // Grading
    autoGrade: { type: Boolean, default: true },
    immediateResults: { type: Boolean, default: true },
    gradingMethod: {
      type: String,
      enum: ["highest", "latest", "average"],
      default: "highest",
    },

    // Access control
    order: { type: Number, required: true, default: 0 },
    isRequired: { type: Boolean, default: false },
    weight: { type: Number, default: 1, min: 0 },

    // Prerequisites
    prerequisites: {
      requiredContents: [{ type: Schema.Types.ObjectId, ref: "Content" }],
      requiredQuizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
      minimumScore: { type: Number, min: 0, max: 100 },
    },

    // Analytics
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0, min: 0, max: 100 },
    passRate: { type: Number, default: 0, min: 0, max: 100 },
    averageTimeSpent: { type: Number, default: 0, min: 0 }, // in seconds

    // Status
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },

    // Instructions
    instructions: { type: String },

    // Security
    preventCheating: {
      randomizeQuestions: { type: Boolean, default: false },
      randomizeOptions: { type: Boolean, default: false },
      disableRightClick: { type: Boolean, default: false },
      lockdownBrowser: { type: Boolean, default: false },
      webcamRequired: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
QuizSchema.index({ course: 1, order: 1 });
QuizSchema.index({ module: 1, order: 1 });
QuizSchema.index({ content: 1 });
QuizSchema.index({ isActive: 1, isPublished: 1 });
QuizSchema.index({ availableFrom: 1, availableUntil: 1 });

// Text search
QuizSchema.index({
  title: "text",
  description: "text",
  instructions: "text",
});

// Virtual for total questions count
QuizSchema.virtual("totalQuestions").get(function (this: IQuiz) {
  return this.questions?.length || 0;
});

// Virtual for estimated time
QuizSchema.virtual("estimatedTime").get(function (this: IQuiz) {
  // Calculate based on questions and their estimated time
  return this.timeLimit || this.questions?.length * 2; // 2 minutes per question default
});

// Methods
QuizSchema.methods.calculateTotalPoints = function (this: IQuiz) {
  return this.questions.reduce((total, q) => total + (q.weight || 1), 0);
};

QuizSchema.methods.getQuestionsWithDetails = async function (this: IQuiz) {
  await this.populate("questions.question");
  return this.questions.sort((a, b) => a.order - b.order);
};

QuizSchema.methods.canUserAttempt = async function (
  this: IQuiz,
  userId: Types.ObjectId
) {
  // Check if quiz is available, user hasn't exceeded attempts, etc.
  const now = new Date();

  // Check availability window
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;

  // Check user's previous attempts (would need to import QuizAttempt model)
  // This is just a placeholder - actual implementation would check attempts
  return true;
};

QuizSchema.methods.updateAnalytics = function (this: IQuiz) {
  // This would typically aggregate data from QuizAttempt collection
  // Placeholder implementation
  return this.save();
};

// Pre-save middleware
QuizSchema.pre("save", function (next) {
  // Sort questions by order
  if (this.questions) {
    this.questions.sort((a, b) => a.order - b.order);
  }

  // Validate scheduling
  if (
    this.availableFrom &&
    this.availableUntil &&
    this.availableFrom >= this.availableUntil
  ) {
    next(new Error("Available from date must be before available until date"));
    return;
  }

  next();
});

export const Quiz = model<IQuiz>("Quiz", QuizSchema);
