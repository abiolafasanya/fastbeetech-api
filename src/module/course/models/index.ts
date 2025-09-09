// Export all course-related models
export * from "./course.model";
export * from "./module.model";
export * from "./content.model";
export * from "./quiz.model";
export * from "./question.model";
export * from "./resource.model";
export * from "./quiz-attempt.model";

// Re-export commonly used types from their respective files
export type {
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
} from "./course.model";

export type { QuestionType, QuestionDifficulty } from "./question.model";

export type { ContentType } from "./content.model";

export type { ResourceType } from "./resource.model";

// Export model instances for easy importing
export { Course, CourseEnrollment, CourseReview } from "./course.model";

export { Module } from "./module.model";
export { Content } from "./content.model";
export { Quiz } from "./quiz.model";
export { Question } from "./question.model";
export { Resource } from "./resource.model";
export { QuizAttempt } from "./quiz-attempt.model";
