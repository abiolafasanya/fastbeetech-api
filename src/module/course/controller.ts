import { Request, Response } from "express";
import catchAsync from "../../shared/request";
import { Course, CourseEnrollment, CourseReview } from "./model";
import { CourseService } from "./service";
import { paginate } from "../../common/utils/pagination";
import {
  createCourseSchema,
  updateCourseSchema,
  enrollCourseSchema,
  updateProgressSchema,
  quizAttemptSchema,
  courseReviewSchema,
  markHelpfulSchema,
  courseSearchSchema,
  courseAnalyticsSchema,
  bulkCourseUpdateSchema,
} from "./validation/course";
import mongoose from "mongoose";
import { ICourseSearch } from "./validation/course";
import { error } from "console";

export class CourseController {
  /**
   * GET /courses - Get all published courses with search/filter
   */
  static findAll = catchAsync(async (req: Request, res: Response) => {
    // Normalize query params (express gives strings). Coerce numbers/booleans/arrays as needed
    const rawQuery = req.query as Record<string, any>;
    const normalizedQuery: Record<string, any> = { ...rawQuery };

    const toNumber = (v: any) => {
      if (v === undefined) return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    };

    const toBoolean = (v: any) => {
      if (v === undefined) return undefined;
      if (v === "true") return true;
      if (v === "false") return false;
      return v;
    };

    if (rawQuery.page !== undefined)
      normalizedQuery.page = toNumber(rawQuery.page);
    if (rawQuery.limit !== undefined)
      normalizedQuery.limit = toNumber(rawQuery.limit);
    if (rawQuery.rating !== undefined)
      normalizedQuery.rating = toNumber(rawQuery.rating);
    if (rawQuery.featured !== undefined)
      normalizedQuery.featured = toBoolean(rawQuery.featured);
    if (rawQuery.bestseller !== undefined)
      normalizedQuery.bestseller = toBoolean(rawQuery.bestseller);
    if (rawQuery.tags !== undefined && typeof rawQuery.tags === "string") {
      // support comma separated tags in query string
      normalizedQuery.tags = rawQuery.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
    }

    const validated = await courseSearchSchema.parseAsync(normalizedQuery);
    const validatedQuery = validated as ICourseSearch;

    console.log("Validated Query:", validatedQuery);
    const pageNum: number = Number(validatedQuery.page) || 1;
    const limitNum: number = Number(validatedQuery.limit) || 12;

    const result = await CourseService.searchCourses(
      validatedQuery,
      pageNum,
      limitNum
    );
    return res.json({
      status: true,
      message: "Courses retrieved successfully",
      data: {
        courses: result.courses,
        pagination: result.pagination,
      },
    });
  });

  /**
   * GET /courses/:slugOrId - Get single course by slug or ID
   */
  static findOne = catchAsync(async (req: Request, res: Response) => {
    const { slugOrId } = req.params;
    const userId = (req as any).user?.id;

    // Try to find by slug first, then by ID
    let course;
    if (mongoose.isValidObjectId(slugOrId)) {
      course = await CourseService.getCourseWithEnrollmentStatus(
        slugOrId,
        userId
      );
    } else {
      const courseDoc = await Course.findOne({ slug: slugOrId }).lean();
      if (courseDoc) {
        course = await CourseService.getCourseWithEnrollmentStatus(
          courseDoc._id.toString(),
          userId
        );
      }
    }

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Hide draft courses from non-instructors/non-admins
    const user = (req as any).user;
    const isOwnerOrAdmin =
      user &&
      (user.role === "admin" ||
        (course.instructor as any)._id?.toString() === user.id ||
        course.coInstructors?.some(
          (co: any) => co._id?.toString() === user.id
        ));

    if (course.status !== "published" && !isOwnerOrAdmin) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    return res.json({
      status: true,
      message: "Course retrieved successfully",
      data: { course },
    });
  });

  /**
   * POST /courses - Create new course (Admin/Instructor)
   */
  static create = catchAsync(async (req: Request, res: Response) => {
    const validatedData = createCourseSchema.parse(req.body);
    const instructorId = (req as any).user.id;

    const processedData = await CourseService.processCourseData(
      validatedData,
      instructorId
    );

    const course = new Course(processedData);
    await course.save();

    await course.populate("instructor", "name email avatar");

    return res.status(201).json({
      status: true,
      message: "Course created successfully",
      data: { course },
    });
  });

  /**
   * PUT /courses/:id - Update course (Owner/Admin)
   */
  static update = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateCourseSchema.parse(req.body);
    const userId = (req as any).user.id;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Check ownership or admin role
    const user = (req as any).user;
    const isOwnerOrAdmin =
      user.role === "admin" ||
      course.instructor.toString() === userId ||
      course.coInstructors?.some((co: any) => co.toString() === userId);

    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized to update this course",
      });
    }

    const processedData = await CourseService.processCourseData(
      validatedData,
      course.instructor.toString()
    );

    Object.assign(course, processedData);
    await course.save();

    await course.populate("instructor", "name email avatar");

    return res.json({
      status: true,
      message: "Course updated successfully",
      data: { course },
    });
  });

  /**
   * DELETE /courses/:id - Delete course (Owner/Admin)
   */
  static delete = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Check ownership or admin role
    const user = (req as any).user;
    const isOwnerOrAdmin =
      user.role === "admin" || course.instructor.toString() === userId;

    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized to delete this course",
      });
    }

    // Soft delete or hard delete based on enrollments
    const hasEnrollments = await CourseEnrollment.countDocuments({
      course: id,
    });

    if (hasEnrollments > 0) {
      // Soft delete - archive the course
      course.status = "archived";
      await course.save();

      return res.json({
        status: true,
        message: "Course archived successfully (has active enrollments)",
      });
    } else {
      // Hard delete
      await Course.findByIdAndDelete(id);
      await CourseReview.deleteMany({ course: id });

      return res.json({
        status: true,
        message: "Course deleted successfully",
      });
    }
  });

  /**
   * PATCH /courses/:id/publish - Publish course (Admin)
   */
  static publish = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const course = await Course.findByIdAndUpdate(
      id,
      {
        status: "published",
        publishedAt: new Date(),
      },
      { new: true }
    ).populate("instructor", "name email avatar");

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    return res.json({
      status: true,
      message: "Course published successfully",
      data: { course },
    });
  });

  /**
   * POST /courses/:id/enroll - Enroll in course
   */
  static enroll = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const enrollment = await CourseService.enrollUser(id, userId);

    return res.status(201).json({
      status: true,
      message: "Successfully enrolled in course",
      data: { enrollment },
    });
  });

  /**
   * POST /courses/:id/unenroll - Unenroll from course
   */
  static unenroll = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const enrollment = await CourseEnrollment.findOneAndUpdate(
      { user: userId, course: id },
      { status: "dropped" },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({
        status: false,
        message: "Enrollment not found",
      });
    }

    // Update course stats
    await Course.findByIdAndUpdate(id, {
      $inc: { activeEnrollments: -1 },
    });

    return res.json({
      status: true,
      message: "Successfully unenrolled from course",
      data: { enrollment },
    });
  });

  /**
   * PUT /courses/:id/progress - Update learning progress
   */
  static updateProgress = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const validatedData = updateProgressSchema.parse(req.body);

    const enrollment = await CourseService.updateProgress(
      id,
      userId,
      validatedData.contentId,
      validatedData.completed
    );

    return res.json({
      status: true,
      message: "Progress updated successfully",
      data: { enrollment },
    });
  });

  /**
   * POST /courses/:id/quiz/:quizId/attempt - Submit quiz attempt
   */
  static submitQuiz = catchAsync(async (req: Request, res: Response) => {
    const { id, quizId } = req.params;
    const userId = (req as any).user.id;
    const validatedData = quizAttemptSchema.parse({
      quizId,
      answers: req.body.answers,
    });

    const result = await CourseService.submitQuizAttempt(
      id,
      userId,
      validatedData.quizId,
      validatedData.answers
    );

    return res.json({
      status: true,
      message: `Quiz ${result.passed ? "passed" : "failed"} with ${result.score}% score`,
      data: {
        score: result.score,
        passed: result.passed,
        enrollment: result.enrollment,
      },
    });
  });

  /**
   * GET /courses/:id/progress - Get user progress
   */
  static getProgress = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const enrollment = await CourseEnrollment.findOne({
      user: userId,
      course: id,
    }).populate("course", "title modules");

    if (!enrollment) {
      return res.status(404).json({
        status: false,
        message: "Enrollment not found",
      });
    }

    return res.json({
      status: true,
      message: "Progress retrieved successfully",
      data: { enrollment },
    });
  });

  /**
   * POST /courses/:id/review - Add course review
   */
  static addReview = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const validatedData = courseReviewSchema.parse(req.body);

    const review = await CourseService.addReview(
      id,
      userId,
      validatedData.rating,
      validatedData.review
    );

    await review.populate("user", "name avatar");

    return res.status(201).json({
      status: true,
      message: "Review added successfully",
      data: { review },
    });
  });

  /**
   * GET /courses/:id/reviews - Get course reviews
   */
  static getReviews = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = "newest" } = req.query;

    let sortStage: any = { createdAt: -1 };
    if (sortBy === "oldest") sortStage = { createdAt: 1 };
    if (sortBy === "rating-high") sortStage = { rating: -1 };
    if (sortBy === "rating-low") sortStage = { rating: 1 };
    if (sortBy === "helpful") sortStage = { helpful: -1 };

    const reviews = await CourseReview.find({ course: id })
      .populate("user", "name avatar")
      .sort(sortStage)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await CourseReview.countDocuments({ course: id });

    return res.json({
      status: true,
      message: "Reviews retrieved successfully",
      data: {
        reviews,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
        },
      },
    });
  });

  /**
   * PUT /reviews/:reviewId/helpful - Mark review helpful/unhelpful
   */
  static markReviewHelpful = catchAsync(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const userId = (req as any).user.id;
    const validatedData = markHelpfulSchema.parse({ reviewId, ...req.body });

    const review = await CourseReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        status: false,
        message: "Review not found",
      });
    }

    const userObjectId = userId;
    const isAlreadyHelpful = review.helpfulByUsers.some(
      (id) => id.toString() === userObjectId.toString()
    );

    if (validatedData.helpful && !isAlreadyHelpful) {
      review.helpful += 1;
      review.helpfulByUsers.push(userObjectId as any);
    } else if (!validatedData.helpful && isAlreadyHelpful) {
      review.helpful -= 1;
      review.helpfulByUsers = review.helpfulByUsers.filter(
        (id) => id.toString() !== userObjectId.toString()
      );
    }

    await review.save();

    return res.json({
      status: true,
      message: "Review helpfulness updated",
      data: {
        helpful: review.helpful,
        userMarkedHelpful: validatedData.helpful,
      },
    });
  });

  /**
   * GET /my-courses - Get user's enrolled courses
   */
  static getMyCourses = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { status = "all", page = 1, limit = 10 } = req.query;

    const filter: any = { user: userId };
    if (status !== "all") {
      filter.status = status;
    }

    const enrollments = await CourseEnrollment.find(filter)
      .populate({
        path: "course",
        populate: {
          path: "instructor",
          select: "name avatar",
        },
      })
      .sort({ enrollmentDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await CourseEnrollment.countDocuments(filter);

    return res.json({
      status: true,
      message: "Your courses retrieved successfully",
      data: {
        enrollments,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
        },
      },
    });
  });

  /**
   * GET /admin/courses - Get all courses for admin
   */
  static getAllCourses = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, status, instructor, search } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (instructor) filter.instructor = instructor;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(filter)
      .populate("instructor", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Course.countDocuments(filter);

    return res.json({
      status: true,
      message: "Courses retrieved successfully",
      data: {
        courses,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
        },
      },
    });
  });

  /**
   * GET /dashboard/courses - Get courses for the authenticated instructor/author (includes drafts)
   */
  static getInstructorCourses = catchAsync(
    async (req: Request, res: Response) => {
      const userId = (req as any).user.id;
      // Normalize and coerce paging params
      const rawQuery = req.query as Record<string, any>;
      const pageNum = rawQuery.page ? Number(rawQuery.page) || 1 : 1;
      const limitNum = rawQuery.limit ? Number(rawQuery.limit) || 10 : 10;

      // Base filter: instructor is user OR coInstructors includes user
      const baseFilter: any = {
        $or: [{ instructor: userId }, { coInstructors: userId }],
      };

      // Optional status filter (draft, published, archived, all)
      if (rawQuery.status && rawQuery.status !== "all") {
        baseFilter.status = rawQuery.status;
      }

      // Optional search
      if (rawQuery.search) {
        const searchRegex = { $regex: rawQuery.search, $options: "i" };
        // Ensure both instructor filter and search are applied
        baseFilter.$and = [
          { $or: [{ title: searchRegex }, { description: searchRegex }] },
        ];
      }

      const courses = await Course.find(baseFilter)
        .populate("instructor", "name email avatar")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

      const total = await Course.countDocuments(baseFilter);

      return res.json({
        status: true,
        message: "Instructor courses retrieved successfully",
        data: {
          courses,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
          },
        },
      });
    }
  );

  /**
   * GET /dashboard/courses/:slugOrId - Get single course for the authenticated instructor/author (includes drafts)
   */
  static getInstructorCourse = catchAsync(
    async (req: Request, res: Response) => {
      const { slugOrId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      // Build query - admins can see all courses, instructors only see their own
      const query: any = {
        $or: [
          { slug: slugOrId },
          { _id: mongoose.Types.ObjectId.isValid(slugOrId) ? slugOrId : null },
        ].filter(Boolean),
      };

      // If not admin, restrict to own courses
      if (userRole !== "admin") {
        query.instructor = userId;
      }

      const course = await Course.findOne(query)
        .populate({
          path: "instructor",
          select: "name email avatar",
        })
        .populate({
          path: "coInstructors",
          select: "name email avatar",
        });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found or you don't have permission to view it",
        });
      }

      res.status(200).json({
        success: true,
        message: "Course retrieved successfully",
        data: { course },
      });
    }
  );

  /**
   * GET /courses/:id/analytics - Get course analytics (Instructor/Admin)
   */
  static getAnalytics = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const query = courseAnalyticsSchema.parse({ courseId: id, ...req.query });

    // Check permissions
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    const user = (req as any).user;
    const hasAccess =
      user.role === "admin" ||
      course.instructor.toString() === userId ||
      course.coInstructors?.some((co: any) => co.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized to view course analytics",
      });
    }

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const analytics = await CourseService.getCourseAnalytics(
      id,
      dateFrom,
      dateTo
    );

    return res.json({
      status: true,
      message: "Analytics retrieved successfully",
      data: { analytics },
    });
  });

  /**
   * POST /admin/courses/bulk - Bulk operations on courses (Admin)
   */
  static bulkUpdate = catchAsync(async (req: Request, res: Response) => {
    const validatedData = bulkCourseUpdateSchema.parse(req.body);

    const updateData: any = {};

    switch (validatedData.operation) {
      case "publish":
        updateData.status = "published";
        updateData.publishedAt = new Date();
        break;
      case "unpublish":
        updateData.status = "draft";
        break;
      case "archive":
        updateData.status = "archived";
        break;
      case "feature":
        updateData.isFeatured = true;
        break;
      case "unfeature":
        updateData.isFeatured = false;
        break;
      case "delete":
        await Course.deleteMany({ _id: { $in: validatedData.courseIds } });
        await CourseEnrollment.deleteMany({
          course: { $in: validatedData.courseIds },
        });
        await CourseReview.deleteMany({
          course: { $in: validatedData.courseIds },
        });

        return res.json({
          status: true,
          message: `${validatedData.courseIds.length} course(s) deleted successfully`,
        });
    }

    const result = await Course.updateMany(
      { _id: { $in: validatedData.courseIds } },
      updateData
    );

    return res.json({
      status: true,
      message: `${result.modifiedCount} course(s) updated successfully`,
    });
  });

  /**
   * GET /categories - Get course categories with counts
   */
  static getCategories = catchAsync(async (req: Request, res: Response) => {
    const categories = await Course.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          subcategories: { $addToSet: "$subcategory" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.json({
      status: true,
      message: "Categories retrieved successfully",
      data: { categories },
    });
  });

  /**
   * GET /instructors - Get instructors with course counts
   */
  static getInstructors = catchAsync(async (req: Request, res: Response) => {
    const instructors = await Course.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$instructor",
          courseCount: { $sum: 1 },
          avgRating: { $avg: "$averageRating" },
          totalEnrollments: { $sum: "$totalEnrollments" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "instructorInfo",
        },
      },
      { $unwind: "$instructorInfo" },
      {
        $project: {
          name: "$instructorInfo.name",
          email: "$instructorInfo.email",
          avatar: "$instructorInfo.avatar",
          courseCount: 1,
          avgRating: { $round: ["$avgRating", 1] },
          totalEnrollments: 1,
        },
      },
      { $sort: { courseCount: -1 } },
    ]);

    return res.json({
      status: true,
      message: "Instructors retrieved successfully",
      data: { instructors },
    });
  });
}
