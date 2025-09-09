import { Document, Schema, model, Types } from "mongoose";

export interface QuizAttempt {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  quiz: Types.ObjectId;

  // Attempt details
  attemptNumber: number;
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number; // seconds

  // Scoring
  score: number; // percentage
  totalPoints: number;
  earnedPoints: number;
  passed: boolean;

  // Answers
  answers: {
    question: Types.ObjectId;
    userAnswer: any; // flexible type for different question types
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent: number; // seconds spent on this question

    // For detailed analysis
    questionType?: string;
    correctAnswer?: any;
    partialCredit?: number; // for questions that allow partial credit
  }[];

  // Status
  isCompleted: boolean;
  isAbandoned: boolean; // if user left without completing
  isGraded: boolean;

  // Feedback
  feedback?: string;
  instructorComments?: string;

  // Proctoring/Security
  securityFlags?: {
    tabSwitches: number;
    copyPasteAttempts: number;
    suspiciousActivity: string[];
  };

  // Browser/Device info
  userAgent?: string;
  ipAddress?: string;
}

export interface IQuizAttempt extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  quiz: Types.ObjectId;
  attemptNumber: number;
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number;
  score: number;
  totalPoints: number;
  earnedPoints: number;
  passed: boolean;
  answers: {
    question: Types.ObjectId;
    userAnswer: any;
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent: number;
    questionType?: string;
    correctAnswer?: any;
    partialCredit?: number;
  }[];
  isCompleted: boolean;
  isAbandoned: boolean;
  isGraded: boolean;
  feedback?: string;
  instructorComments?: string;
  securityFlags?: {
    tabSwitches: number;
    copyPasteAttempts: number;
    suspiciousActivity: string[];
  };
  userAgent?: string;
  ipAddress?: string;

  // Methods
  calculateScore(): void;
  markAsCompleted(): Promise<IQuizAttempt>;
  addSecurityFlag(flag: string): Promise<IQuizAttempt>;
  getDetailedResults(): any;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
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
    quiz: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },

    // Attempt details
    attemptNumber: { type: Number, required: true, min: 1 },
    startedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, index: true },
    timeSpent: { type: Number, default: 0, min: 0 }, // seconds

    // Scoring
    score: { type: Number, min: 0, max: 100, default: 0 },
    totalPoints: { type: Number, min: 0, default: 0 },
    earnedPoints: { type: Number, min: 0, default: 0 },
    passed: { type: Boolean, default: false, index: true },

    // Answers
    answers: [
      {
        question: {
          type: Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        userAnswer: { type: Schema.Types.Mixed }, // flexible for different answer types
        isCorrect: { type: Boolean, required: true },
        pointsEarned: { type: Number, min: 0, default: 0 },
        timeSpent: { type: Number, min: 0, default: 0 },
        questionType: { type: String },
        correctAnswer: { type: Schema.Types.Mixed },
        partialCredit: { type: Number, min: 0, max: 1 }, // decimal percentage for partial credit
      },
    ],

    // Status
    isCompleted: { type: Boolean, default: false, index: true },
    isAbandoned: { type: Boolean, default: false },
    isGraded: { type: Boolean, default: false, index: true },

    // Feedback
    feedback: { type: String },
    instructorComments: { type: String },

    // Proctoring/Security
    securityFlags: {
      tabSwitches: { type: Number, default: 0 },
      copyPasteAttempts: { type: Number, default: 0 },
      suspiciousActivity: [{ type: String }],
    },

    // Browser/Device info
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
QuizAttemptSchema.index(
  { user: 1, quiz: 1, attemptNumber: 1 },
  { unique: true }
);
QuizAttemptSchema.index({ user: 1, course: 1 });
QuizAttemptSchema.index({ quiz: 1, isCompleted: 1 });
QuizAttemptSchema.index({ completedAt: -1 });

// Virtual for duration in readable format
QuizAttemptSchema.virtual("formattedDuration").get(function (
  this: IQuizAttempt
) {
  if (!this.timeSpent) return "0m";

  const hours = Math.floor(this.timeSpent / 3600);
  const minutes = Math.floor((this.timeSpent % 3600) / 60);
  const seconds = this.timeSpent % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

// Virtual for grade letter
QuizAttemptSchema.virtual("gradeLetter").get(function (this: IQuizAttempt) {
  if (this.score >= 90) return "A";
  if (this.score >= 80) return "B";
  if (this.score >= 70) return "C";
  if (this.score >= 60) return "D";
  return "F";
});

// Virtual for performance level
QuizAttemptSchema.virtual("performanceLevel").get(function (
  this: IQuizAttempt
) {
  if (this.score >= 90) return "Excellent";
  if (this.score >= 80) return "Good";
  if (this.score >= 70) return "Satisfactory";
  if (this.score >= 60) return "Needs Improvement";
  return "Poor";
});

// Methods
QuizAttemptSchema.methods.calculateScore = function (this: IQuizAttempt) {
  if (this.answers.length === 0) {
    this.score = 0;
    this.earnedPoints = 0;
    return;
  }

  this.earnedPoints = this.answers.reduce(
    (total, answer) => total + answer.pointsEarned,
    0
  );
  this.score =
    this.totalPoints > 0
      ? Math.round((this.earnedPoints / this.totalPoints) * 100)
      : 0;

  // Check if passed (would need to populate quiz to get passing score)
  // This is a placeholder - actual implementation would check quiz.passingScore
  this.passed = this.score >= 70;
};

QuizAttemptSchema.methods.markAsCompleted = async function (
  this: IQuizAttempt
) {
  this.isCompleted = true;
  this.completedAt = new Date();

  // Calculate final scores
  this.calculateScore();

  // If auto-graded, mark as graded
  // (would check quiz settings in actual implementation)
  this.isGraded = true;

  return this.save();
};

QuizAttemptSchema.methods.addSecurityFlag = async function (
  this: IQuizAttempt,
  flag: string
) {
  if (!this.securityFlags) {
    this.securityFlags = {
      tabSwitches: 0,
      copyPasteAttempts: 0,
      suspiciousActivity: [],
    };
  }

  this.securityFlags.suspiciousActivity.push(flag);
  return this.save();
};

QuizAttemptSchema.methods.getDetailedResults = function (this: IQuizAttempt) {
  const formattedDuration = (() => {
    if (!this.timeSpent) return "0m";
    const hours = Math.floor(this.timeSpent / 3600);
    const minutes = Math.floor((this.timeSpent % 3600) / 60);
    const seconds = this.timeSpent % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  })();

  const gradeLetter = (() => {
    if (this.score >= 90) return "A";
    if (this.score >= 80) return "B";
    if (this.score >= 70) return "C";
    if (this.score >= 60) return "D";
    return "F";
  })();

  const performanceLevel = (() => {
    if (this.score >= 90) return "Excellent";
    if (this.score >= 80) return "Good";
    if (this.score >= 70) return "Satisfactory";
    if (this.score >= 60) return "Needs Improvement";
    return "Poor";
  })();

  return {
    attemptId: this._id,
    score: this.score,
    grade: gradeLetter,
    performance: performanceLevel,
    timeSpent: formattedDuration,
    questionsCount: this.answers.length,
    correctAnswers: this.answers.filter((a) => a.isCorrect).length,
    passed: this.passed,
    completedAt: this.completedAt,
    answers: this.answers.map((answer) => ({
      questionId: answer.question,
      isCorrect: answer.isCorrect,
      pointsEarned: answer.pointsEarned,
      timeSpent: answer.timeSpent,
      partialCredit: answer.partialCredit,
    })),
  };
};

// Pre-save middleware
QuizAttemptSchema.pre("save", function (next) {
  // Calculate time spent if completed
  if (this.isCompleted && this.completedAt && !this.timeSpent) {
    this.timeSpent = Math.floor(
      (this.completedAt.getTime() - this.startedAt.getTime()) / 1000
    );
  }

  // Auto-calculate score if answers exist
  if (this.answers.length > 0 && !this.isGraded) {
    this.calculateScore();
  }

  next();
});

// Static methods
QuizAttemptSchema.statics.getAttemptStatistics = async function (
  quizId: Types.ObjectId
) {
  return this.aggregate([
    { $match: { quiz: quizId, isCompleted: true } },
    {
      $group: {
        _id: "$quiz",
        totalAttempts: { $sum: 1 },
        averageScore: { $avg: "$score" },
        passRate: {
          $avg: { $cond: [{ $gte: ["$score", 70] }, 1, 0] },
        },
        averageTimeSpent: { $avg: "$timeSpent" },
      },
    },
  ]);
};

QuizAttemptSchema.statics.getUserBestAttempt = async function (
  userId: Types.ObjectId,
  quizId: Types.ObjectId
) {
  return this.findOne({
    user: userId,
    quiz: quizId,
    isCompleted: true,
  }).sort({ score: -1, completedAt: -1 });
};

export const QuizAttempt = model<IQuizAttempt>(
  "QuizAttempt",
  QuizAttemptSchema
);
