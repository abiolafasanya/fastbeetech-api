import mongoose from "mongoose";
import {
  Course,
  CourseEnrollment,
  CourseReview,
  ICourse,
  ICourseEnrollment,
  ICourseReview,
} from "./model";
import { IUser } from "../user/model";
import slugify from "../../common/utils/slugify";

export class CourseService {
  /**
   * Generate unique course slug
   */
  static async generateUniqueSlug(
    title: string,
    courseId?: string
  ): Promise<string> {
    let slug = slugify(title);
    let counter = 0;
    let originalSlug = slug;

    while (true) {
      const existingCourse = await Course.findOne({
        slug,
        ...(courseId && { _id: { $ne: courseId } }),
      });

      if (!existingCourse) break;

      counter++;
      slug = `${originalSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Extract YouTube video ID from URL
   */
  static extractYouTubeId(url: string): string | null {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  /**
   * Process course data before saving
   */
  static async processCourseData(
    courseData: any,
    instructorId: string
  ): Promise<any> {
    // Generate slug if not provided
    if (!courseData.slug) {
      courseData.slug = await this.generateUniqueSlug(courseData.title);
    }

    // Set instructor
    courseData.instructor = instructorId;

    // Process modules and contents
    if (courseData.modules) {
      courseData.modules.forEach((module: any, moduleIndex: number) => {
        module.order = module.order ?? moduleIndex;

        if (module.contents) {
          module.contents.forEach((content: any, contentIndex: number) => {
            content.order = content.order ?? contentIndex;

            // Extract YouTube video ID if video URL provided
            if (content.videoUrl && content.type === "video") {
              content.videoId = this.extractYouTubeId(content.videoUrl);
            }

            // Process quiz questions
            if (content.quiz && content.quiz.questions) {
              content.quiz.questions.forEach(
                (question: any, questionIndex: number) => {
                  question.order = question.order ?? questionIndex;
                }
              );
            }
          });
        }

        // Process module quiz
        if (module.quiz && module.quiz.questions) {
          module.quiz.questions.forEach(
            (question: any, questionIndex: number) => {
              question.order = question.order ?? questionIndex;
            }
          );
        }
      });
    }

    return courseData;
  }

  /**
   * Get course with enrollment status for specific user
   */
  static async getCourseWithEnrollmentStatus(
    courseId: string,
    userId?: string
  ): Promise<ICourse & { enrollmentStatus?: string; userProgress?: any }> {
    const course = await Course.findById(courseId)
      .populate("instructor", "name email avatar")
      .populate("coInstructors", "name email avatar")
      .lean();
    if (!course) {
      throw new Error("Course not found");
    }
    let enrollmentStatus;
    let userProgress;

    if (userId) {
      const enrollment = await CourseEnrollment.findOne({
        user: userId,
        course: courseId,
      }).lean();

      if (enrollment) {
        enrollmentStatus = enrollment.status;
        userProgress = enrollment.progress;
      }
    }

    return {
      ...course,
      enrollmentStatus,
      userProgress,
    } as any;
  }

  /**
   * Enroll user in course
   */
  static async enrollUser(
    courseId: string,
    userId: string
  ): Promise<ICourseEnrollment> {
    // Check if course exists and is published
    const course = await Course.findOne({
      _id: courseId,
      status: "published",
    });

    if (!course) {
      throw new Error("Course not found or not available for enrollment");
    }

    // Check if user already enrolled
    const existingEnrollment = await CourseEnrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (existingEnrollment) {
      throw new Error("User already enrolled in this course");
    }

    // Calculate totals
    let totalContents = 0;
    let totalQuizzes = 0;

    course.modules.forEach((module) => {
      totalContents += module.contents.length;
      totalQuizzes += module.contents.filter((c) => c.type === "quiz").length;
      if (module.quiz) totalQuizzes++;
    });

    // Create enrollment
    const enrollment = new CourseEnrollment({
      user: userId,
      course: courseId,
      status: "enrolled",
      progress: {
        completedContents: [],
        completedQuizzes: [],
        totalContents,
        totalQuizzes,
        progressPercentage: 0,
      },
      quizAttempts: [],
    });

    await enrollment.save();

    // Update course enrollment stats
    await Course.findByIdAndUpdate(courseId, {
      $inc: {
        totalEnrollments: 1,
        activeEnrollments: 1,
      },
    });

    return enrollment;
  }

  /**
   * Update user progress
   */
  static async updateProgress(
    courseId: string,
    userId: string,
    contentId: string,
    completed: boolean = true
  ): Promise<ICourseEnrollment> {
    const enrollment = await CourseEnrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) {
      throw new Error("User not enrolled in this course");
    }

    const contentObjectId = contentId;

    if (completed) {
      // Add to completed if not already there
      if (
        !enrollment.progress.completedContents.some(
          (id) => id.toString() === contentObjectId.toString()
        )
      ) {
        enrollment.progress.completedContents.push(contentObjectId as any);
      }

      // Update last accessed content
      enrollment.progress.lastAccessedContent = contentObjectId as any;

      // Update status to in-progress if still enrolled
      if (enrollment.status === "enrolled") {
        enrollment.status = "in-progress";
      }
    } else {
      // Remove from completed
      enrollment.progress.completedContents =
        enrollment.progress.completedContents.filter(
          (id) => id.toString() !== contentObjectId.toString()
        );
    }

    // Recalculate progress percentage
    const completedCount = enrollment.progress.completedContents.length;
    const totalCount = enrollment.progress.totalContents;
    enrollment.progress.progressPercentage =
      totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Check if course is completed
    if (
      enrollment.progress.progressPercentage === 100 &&
      enrollment.status !== "completed"
    ) {
      enrollment.status = "completed";
      enrollment.completionDate = new Date();

      // Update course completion stats
      await this.updateCourseCompletionStats(courseId);
    }

    await enrollment.save();
    return enrollment;
  }

  /**
   * Submit quiz attempt
   */
  static async submitQuizAttempt(
    courseId: string,
    userId: string,
    quizId: string,
    answers: Record<string, any>
  ): Promise<{
    score: number;
    passed: boolean;
    enrollment: ICourseEnrollment;
  }> {
    const enrollment = await CourseEnrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) {
      throw new Error("User not enrolled in this course");
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Find the quiz in course structure
    let quiz: any = null;
    let isModuleQuiz = false;

    // Search in course modules
    for (const module of course.modules) {
      // Check module quiz
      if (module.quiz && module.quiz._id?.toString() === quizId) {
        quiz = module.quiz;
        isModuleQuiz = true;
        break;
      }

      // Check content quizzes
      for (const content of module.contents) {
        if (content.quiz && content.quiz._id?.toString() === quizId) {
          quiz = content.quiz;
          break;
        }
      }
      if (quiz) break;
    }

    if (!quiz) {
      throw new Error("Quiz not found in course");
    }

    // Check existing attempts
    let quizAttemptRecord = enrollment.quizAttempts.find(
      (qa) => qa.quiz.toString() === quizId
    );

    if (!quizAttemptRecord) {
      quizAttemptRecord = {
        quiz: quizId as any,
        attempts: [],
      };
      enrollment.quizAttempts.push(quizAttemptRecord);
    }

    // Check if max attempts exceeded
    if (quizAttemptRecord.attempts.length >= quiz.maxAttempts) {
      throw new Error(
        `Maximum attempts (${quiz.maxAttempts}) exceeded for this quiz`
      );
    }

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    quiz.questions.forEach((question: any) => {
      totalPoints += question.points || 1;

      const userAnswer = answers[question._id?.toString()];
      const correctAnswer = question.correctAnswer;

      if (Array.isArray(correctAnswer)) {
        // Multiple correct answers
        if (
          Array.isArray(userAnswer) &&
          userAnswer.sort().join(",") === correctAnswer.sort().join(",")
        ) {
          earnedPoints += question.points || 1;
        }
      } else {
        // Single correct answer
        if (userAnswer === correctAnswer) {
          earnedPoints += question.points || 1;
        }
      }
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;

    // Record attempt
    quizAttemptRecord.attempts.push({
      score,
      completedAt: new Date(),
      answers,
    });

    // If passed and not already in completed quizzes, add it
    if (passed) {
      const quizObjectId = quizId;
      if (
        !enrollment.progress.completedQuizzes.some(
          (id) => id.toString() === quizObjectId.toString()
        )
      ) {
        enrollment.progress.completedQuizzes.push(quizObjectId as any);
      }
    }

    await enrollment.save();

    return { score, passed, enrollment };
  }

  /**
   * Add course review
   */
  static async addReview(
    courseId: string,
    userId: string,
    rating: number,
    review: string
  ): Promise<ICourseReview> {
    // Check if user is enrolled and has made progress
    const enrollment = await CourseEnrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) {
      throw new Error("You must be enrolled in the course to leave a review");
    }

    // Check if user already reviewed
    const existingReview = await CourseReview.findOne({
      user: userId,
      course: courseId,
    });

    if (existingReview) {
      throw new Error("You have already reviewed this course");
    }

    // Create review
    const courseReview = new CourseReview({
      user: userId,
      course: courseId,
      rating,
      review,
      isVerifiedPurchase: true,
    });

    await courseReview.save();

    // Update course rating stats
    await this.updateCourseRatingStats(courseId);

    return courseReview;
  }

  /**
   * Update course rating statistics
   */
  static async updateCourseRatingStats(courseId: string): Promise<void> {
    const stats = await CourseReview.aggregate([
      { $match: { course: courseId as any } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratings: { $push: "$rating" },
        },
      },
    ]);

    if (stats.length > 0) {
      const { averageRating, totalReviews, ratings } = stats[0];

      // Calculate rating distribution
      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratings.forEach((rating: number) => {
        ratingDistribution[rating as keyof typeof ratingDistribution]++;
      });

      await Course.findByIdAndUpdate(courseId, {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
        ratingDistribution,
      });
    }
  }

  /**
   * Update course completion statistics
   */
  static async updateCourseCompletionStats(courseId: string): Promise<void> {
    const stats = await CourseEnrollment.aggregate([
      { $match: { course: courseId as any } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedEnrollments: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          activeEnrollments: {
            $sum: {
              $cond: [{ $in: ["$status", ["enrolled", "in-progress"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    if (stats.length > 0) {
      const { totalEnrollments, completedEnrollments, activeEnrollments } =
        stats[0];
      const completionRate =
        totalEnrollments > 0
          ? (completedEnrollments / totalEnrollments) * 100
          : 0;

      await Course.findByIdAndUpdate(courseId, {
        totalEnrollments,
        activeEnrollments,
        completionRate: Math.round(completionRate * 10) / 10,
      });
    }
  }

  /**
   * Get course analytics
   */
  static async getCourseAnalytics(
    courseId: string,
    dateFrom?: Date,
    dateTo?: Date
  ) {
    const matchStage: any = { course: courseId as any };

    if (dateFrom || dateTo) {
      matchStage.enrollmentDate = {};
      if (dateFrom) matchStage.enrollmentDate.$gte = dateFrom;
      if (dateTo) matchStage.enrollmentDate.$lte = dateTo;
    }

    const analytics = await CourseEnrollment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedCourses: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgressCourses: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          droppedCourses: {
            $sum: { $cond: [{ $eq: ["$status", "dropped"] }, 1, 0] },
          },
          avgProgress: { $avg: "$progress.progressPercentage" },
          enrollmentsByMonth: {
            $push: {
              month: {
                $dateToString: { format: "%Y-%m", date: "$enrollmentDate" },
              },
              date: "$enrollmentDate",
            },
          },
        },
      },
    ]);

    // Get reviews analytics
    const reviewStats = await CourseReview.aggregate([
      { $match: { course: courseId as any } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    return {
      enrollments: analytics[0] || {
        totalEnrollments: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        droppedCourses: 0,
        avgProgress: 0,
      },
      reviews: reviewStats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [],
      },
    };
  }

  /**
   * Search courses with filters
   */
  static async searchCourses(
    filters: any,
    page: number = 1,
    limit: number = 12
  ) {
    const skip = (page - 1) * limit;
    const matchStage: any = { status: "published" };

    // Apply filters
    if (filters.search) {
      matchStage.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { shortDescription: { $regex: filters.search, $options: "i" } },
      ];
    }

    if (filters.category) {
      matchStage.category = filters.category;
    }

    if (filters.subcategory) {
      matchStage.subcategory = filters.subcategory;
    }

    if (filters.level) {
      matchStage.level = filters.level;
    }

    if (filters.price === "free") {
      matchStage.isFree = true;
    } else if (filters.price === "paid") {
      matchStage.isFree = false;
    }

    if (filters.rating) {
      matchStage.averageRating = { $gte: filters.rating };
    }

    if (filters.instructor) {
      matchStage.instructor = filters.instructor as any;
    }

    if (filters.tags && filters.tags.length > 0) {
      matchStage.tags = { $in: filters.tags };
    }

    if (filters.featured !== undefined) {
      matchStage.isFeatured = filters.featured;
    }

    if (filters.bestseller !== undefined) {
      matchStage.isBestseller = filters.bestseller;
    }

    if (filters.language) {
      matchStage.language = filters.language;
    }

    // Duration filter
    if (filters.duration) {
      switch (filters.duration) {
        case "short":
          matchStage.totalDuration = { $lte: 7200 }; // 0-2 hours
          break;
        case "medium":
          matchStage.totalDuration = { $gte: 7200, $lte: 21600 }; // 2-6 hours
          break;
        case "long":
          matchStage.totalDuration = { $gte: 21600 }; // 6+ hours
          break;
      }
    }

    // Sort stage
    let sortStage: any = {};
    switch (filters.sortBy) {
      case "price-low":
        sortStage.price = 1;
        break;
      case "price-high":
        sortStage.price = -1;
        break;
      case "rating":
        sortStage.averageRating = -1;
        break;
      case "popular":
        sortStage.totalEnrollments = -1;
        break;
      case "trending":
        // Trending based on recent enrollments and rating
        sortStage = { averageRating: -1, totalEnrollments: -1, createdAt: -1 };
        break;
      case "oldest":
        sortStage.createdAt = 1;
        break;
      default: // newest
        sortStage.createdAt = -1;
    }

    const courses = await Course.find(matchStage)
      .populate("instructor", "name email avatar")
      .sort(sortStage)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Course.countDocuments(matchStage);

    return {
      courses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}
