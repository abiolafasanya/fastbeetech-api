import { Document, Schema, model, Types } from "mongoose";

// Question type enums
export type QuestionType =
  | "multiple-choice"
  | "single-choice"
  | "true-false"
  | "fill-blank"
  | "essay"
  | "code-review"
  | "matching"
  | "ordering"
  | "numeric";

export type QuestionDifficulty = "easy" | "medium" | "hard";

// Base Question Interface
export interface BaseQuestion {
  _id?: Types.ObjectId;
  question: string;
  type: QuestionType;
  explanation?: string;
  points: number;
  tags: string[];
  difficulty: QuestionDifficulty;
  estimatedTime?: number; // seconds
  mediaUrl?: string; // for images/videos in questions
  mediaType?: "image" | "video" | "audio";
  category?: string;
  createdBy: Types.ObjectId;

  // Question bank/reusability
  isPublic: boolean; // can be used by other instructors
  usageCount: number; // how many times it's been used

  // Analytics
  successRate?: number; // percentage of correct answers
  averageTime?: number; // average time to answer

  // Versioning
  version: number;
  parentQuestion?: Types.ObjectId; // if this is a modified version

  // Status
  isActive: boolean;
}

// Multiple Choice Question (can have multiple correct answers)
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple-choice";
  options: {
    id: string; // unique identifier for the option
    text: string;
    isCorrect: boolean;
    explanation?: string;
    order: number;
  }[];
  allowPartialCredit: boolean;
}

// Single Choice Question (only one correct answer)
export interface SingleChoiceQuestion extends BaseQuestion {
  type: "single-choice";
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
    order: number;
  }[];
}

// True/False Question
export interface TrueFalseQuestion extends BaseQuestion {
  type: "true-false";
  correctAnswer: boolean;
}

// Fill in the Blank Question
export interface FillBlankQuestion extends BaseQuestion {
  type: "fill-blank";
  questionText: string; // with blanks marked as {blank} or similar
  blanks: {
    id: string;
    correctAnswers: string[]; // multiple acceptable answers
    caseSensitive: boolean;
    exactMatch: boolean; // or allow fuzzy matching
    position: number; // position in the text
  }[];
}

// Essay Question
export interface EssayQuestion extends BaseQuestion {
  type: "essay";
  minWords?: number;
  maxWords?: number;
  rubric?: {
    criteria: string;
    points: number;
    description: string;
  }[];
  autoGrade: boolean; // if using AI grading
}

// Code Review Question
export interface CodeReviewQuestion extends BaseQuestion {
  type: "code-review";
  codeSnippet: string;
  language: string;
  correctAnswer?: string;
  testCases?: {
    input: string;
    expectedOutput: string;
    description?: string;
  }[];
  allowedLanguages?: string[]; // if multiple languages accepted
}

// Matching Question
export interface MatchingQuestion extends BaseQuestion {
  type: "matching";
  leftColumn: {
    id: string;
    text: string;
    mediaUrl?: string;
  }[];
  rightColumn: {
    id: string;
    text: string;
    mediaUrl?: string;
  }[];
  correctMatches: {
    leftId: string;
    rightId: string;
  }[];
}

// Ordering Question
export interface OrderingQuestion extends BaseQuestion {
  type: "ordering";
  items: {
    id: string;
    text: string;
    correctOrder: number;
  }[];
}

// Numeric Question
export interface NumericQuestion extends BaseQuestion {
  type: "numeric";
  correctAnswer: number;
  tolerance?: number; // allowed deviation
  unit?: string;
  format?: "integer" | "decimal" | "scientific";
}

// Union type for all question types
export type QuestionDoc =
  | MultipleChoiceQuestion
  | SingleChoiceQuestion
  | TrueFalseQuestion
  | FillBlankQuestion
  | EssayQuestion
  | CodeReviewQuestion
  | MatchingQuestion
  | OrderingQuestion
  | NumericQuestion;

// Document interface
export interface IQuestion extends Document {
  question: string;
  type: QuestionType;
  explanation?: string;
  points: number;
  tags: string[];
  difficulty: QuestionDifficulty;
  estimatedTime?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
  category?: string;
  createdBy: Types.ObjectId;
  isPublic: boolean;
  usageCount: number;
  successRate?: number;
  averageTime?: number;
  version: number;
  parentQuestion?: Types.ObjectId;
  isActive: boolean;

  // Type-specific fields
  options?: any[];
  allowPartialCredit?: boolean;
  correctAnswer?: any;
  questionText?: string;
  blanks?: any[];
  minWords?: number;
  maxWords?: number;
  rubric?: any[];
  autoGrade?: boolean;
  codeSnippet?: string;
  language?: string;
  testCases?: any[];
  allowedLanguages?: string[];
  leftColumn?: any[];
  rightColumn?: any[];
  correctMatches?: any[];
  items?: any[];
  tolerance?: number;
  unit?: string;
  format?: string;

  // Methods
  incrementUsage(): Promise<IQuestion>;
  updateAnalytics(isCorrect: boolean, timeSpent: number): Promise<IQuestion>;
}

// Flexible schema that can handle all question types
const QuestionSchema = new Schema<IQuestion>(
  {
    question: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        "multiple-choice",
        "single-choice",
        "true-false",
        "fill-blank",
        "essay",
        "code-review",
        "matching",
        "ordering",
        "numeric",
      ],
    },
    explanation: { type: String },
    points: { type: Number, required: true, min: 0, default: 1 },
    tags: [{ type: String, lowercase: true, trim: true }],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    estimatedTime: { type: Number, min: 0 }, // seconds
    mediaUrl: { type: String },
    mediaType: {
      type: String,
      enum: ["image", "video", "audio"],
    },
    category: { type: String, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Question bank fields
    isPublic: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },

    // Analytics
    successRate: { type: Number, min: 0, max: 100 },
    averageTime: { type: Number, min: 0 },

    // Versioning
    version: { type: Number, default: 1 },
    parentQuestion: { type: Schema.Types.ObjectId, ref: "Question" },

    // Status
    isActive: { type: Boolean, default: true },

    // Type-specific fields (using Mixed type for flexibility)
    // Multiple Choice / Single Choice
    options: [
      {
        id: { type: String },
        text: { type: String },
        isCorrect: { type: Boolean },
        explanation: { type: String },
        order: { type: Number },
      },
    ],
    allowPartialCredit: { type: Boolean, default: false },

    // True/False
    correctAnswer: { type: Schema.Types.Mixed },

    // Fill in the Blank
    questionText: { type: String },
    blanks: [
      {
        id: { type: String },
        correctAnswers: [{ type: String }],
        caseSensitive: { type: Boolean, default: false },
        exactMatch: { type: Boolean, default: true },
        position: { type: Number },
      },
    ],

    // Essay
    minWords: { type: Number, min: 0 },
    maxWords: { type: Number, min: 0 },
    rubric: [
      {
        criteria: { type: String },
        points: { type: Number },
        description: { type: String },
      },
    ],
    autoGrade: { type: Boolean, default: false },

    // Code Review
    codeSnippet: { type: String },
    language: { type: String },
    testCases: [
      {
        input: { type: String },
        expectedOutput: { type: String },
        description: { type: String },
      },
    ],
    allowedLanguages: [{ type: String }],

    // Matching
    leftColumn: [
      {
        id: { type: String },
        text: { type: String },
        mediaUrl: { type: String },
      },
    ],
    rightColumn: [
      {
        id: { type: String },
        text: { type: String },
        mediaUrl: { type: String },
      },
    ],
    correctMatches: [
      {
        leftId: { type: String },
        rightId: { type: String },
      },
    ],

    // Ordering
    items: [
      {
        id: { type: String },
        text: { type: String },
        correctOrder: { type: Number },
      },
    ],

    // Numeric
    tolerance: { type: Number },
    unit: { type: String },
    format: {
      type: String,
      enum: ["integer", "decimal", "scientific"],
      default: "decimal",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
QuestionSchema.index({ type: 1, difficulty: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ category: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ isPublic: 1, isActive: 1 });
QuestionSchema.index({ successRate: -1 });
QuestionSchema.index({ createdAt: -1 });

// Text search index
QuestionSchema.index({
  question: "text",
  explanation: "text",
  tags: "text",
  category: "text",
});

// Virtual for question usage analytics
QuestionSchema.virtual("isPopular").get(function (this: IQuestion) {
  return this.usageCount > 10 && this.successRate && this.successRate > 70;
});

// Methods
QuestionSchema.methods.incrementUsage = function (this: IQuestion) {
  this.usageCount += 1;
  return this.save();
};

QuestionSchema.methods.updateAnalytics = function (
  this: IQuestion,
  isCorrect: boolean,
  timeSpent: number
) {
  // Update success rate and average time
  // This would typically be done in batch operations for better performance
  return this.save();
};

export const Question = model<IQuestion>("Question", QuestionSchema);
