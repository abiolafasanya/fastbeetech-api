// ...existing code...
// blog/controller.ts
import { Request, Response } from "express";
import catchAsync from "../../shared/request";
import { BlogPost } from "./model";
import { paginate } from "../../common/utils/pagination";
import createPostSchema, {
  commentSchema,
  updatePostSchema,
} from "./validation/blog";
import slugify from "../../common/utils/slugify";
import { PipelineStage } from "mongoose";
import mongoose from "mongoose";

// Allow only certain fields on update
const ALLOWED_UPDATE_FIELDS = [
  "title",
  "slug",
  "content",
  "excerpt",
  "cover",
  "tags",
  "status", // still ok to move draft ↔ scheduled ↔ archived
  "scheduledFor",
  "isFeatured",
  "metaTitle",
  "metaDescription",
  "ogImage",
  "canonical",
  "allowComments",
] as const;

const pick = <T extends object>(obj: T, allowed: readonly (keyof T)[]) =>
  allowed.reduce((acc, key) => {
    if (obj[key] !== undefined) (acc as any)[key] = obj[key];
    return acc;
  }, {} as Partial<T>);

export class BlogPostController {
  // POST /posts/:id/share
  static share = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ status: false, message: "Unauthorized" });
    const post = await BlogPost.findById(req.params.id);
    if (!post)
      return res.status(404).json({ status: false, message: "Post not found" });
    const alreadyShared = post.sharesByUser.some(
      (s: any) => s.user.toString() === userId
    );
    if (alreadyShared) {
      return res.json({ status: true, shares: post.shares, shared: true });
    }
    post.shares += 1;
    post.sharesByUser.push({
      user: userId as any,
      sharedAt: new Date(),
    });
    await post.save();
    return res.json({ status: true, shares: post.shares, shared: true });
  });
  // GET /posts (public): only published & not deleted unless authenticated + role=admin
  static findAll = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      tag,
      status,
      author,
      featured,
      trending,
      search,
      from,
      to,
    } = req.query as Record<string, string>;

    // Determine access: admins/super-admins or users with blog:manage_all
    const user = (req as any).user;
    const userPermissions: string[] = user?.permissions ?? [];
    const role: string | undefined = user?.role;

    const canManageAll =
      role === "admin" ||
      role === "super-admin" ||
      userPermissions.includes("blog:manage_all");
    const canManageOwn = userPermissions.includes("blog:manage_own");

    const filter: any = { isDeleted: false };

    // If caller can manage all, allow passing explicit status, otherwise default to published
    if (canManageAll && status) filter.status = status;
    if (!canManageAll) filter.status = "published";

    if (tag)
      filter.tags = { $in: tag.split(",").map((s) => s.trim().toLowerCase()) };
    if (author) filter.author = author;
    if (featured === "true") filter.isFeatured = true;

    if (trending === "true") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filter.createdAt = { $gte: weekAgo };
    }

    if (from || to) {
      filter.publishedAt = {};
      if (from) filter.publishedAt.$gte = new Date(from);
      if (to) filter.publishedAt.$lte = new Date(to);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const blogs = await paginate(BlogPost, filter, {
      page: Number(page),
      limit: Number(limit),
      sort: { publishedAt: -1, createdAt: -1 },
      select:
        "title slug excerpt cover tags author publishedAt status likes views isFeatured readingTime wordCount",
      populate: { path: "author", select: "name avatar" }, // optional
      lean: true, // good for API performance
    });

    return res.json({ status: true, ...blogs });
  });

  static allPosts = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 10,
      tag,
      status,
      author,
      featured,
      trending,
      search,
      from,
      to,
    } = req.query as Record<string, string>;

    // admin posts listing for dashboard: allow admins, super-admins, blog:manage_all and authors (manage_own for own drafts)
    const user = (req as any).user;
    const userPermissions: string[] = user?.permissions ?? [];
    const role: string | undefined = user?.role;

    const canManageAll =
      role === "admin" ||
      role === "super-admin" ||
      userPermissions.includes("blog:manage_all");
    const canManageOwn = userPermissions.includes("blog:manage_own");

    const filter: any = { isDeleted: false };

    // Allow admins/manage_all users to filter by status; others default to published
    if (canManageAll && status) filter.status = status;
    if (!canManageAll) filter.status = "published";

    // If user can only manage own posts, limit to their author id (but still allow drafts)
    if (!canManageAll && canManageOwn && user?.id) {
      filter.$or = [{ author: user.id }, { status: "published" }];
      // If status was explicitly requested and is 'draft' or similar, apply it for own posts
      if (status && status !== "published") {
        filter.$or = [{ author: user.id, status }, { status: "published" }];
      }
    }

    if (tag)
      filter.tags = { $in: tag.split(",").map((s) => s.trim().toLowerCase()) };
    if (author) filter.author = author;
    if (featured === "true") filter.isFeatured = true;

    if (trending === "true") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filter.createdAt = { $gte: weekAgo };
    }

    if (from || to) {
      filter.publishedAt = {};
      if (from) filter.publishedAt.$gte = new Date(from);
      if (to) filter.publishedAt.$lte = new Date(to);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const blogs = await paginate(BlogPost, filter, {
      page: Number(page),
      limit: Number(limit),
      sort: { publishedAt: -1, createdAt: -1 },
      select:
        "title slug excerpt cover tags author publishedAt status likes views isFeatured readingTime wordCount",
      populate: { path: "author", select: "name avatar" }, // optional
      lean: true, // good for API performance
    });

    return res.json({ status: true, ...blogs });
  });

  // GET /posts/:slug (public)
  static findOne = catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userPermissions: string[] = user?.permissions ?? [];
    const role: string | undefined = user?.role;

    const canManageAll =
      role === "admin" ||
      role === "super-admin" ||
      userPermissions.includes("blog:manage_all");
    const canManageOwn = userPermissions.includes("blog:manage_own");

    const filter: any = { slug: req.params.slug, isDeleted: false };
    if (!canManageAll) {
      // If user can manage own posts, allow them to view their own drafts
      if (canManageOwn && user?.id) {
        filter.$or = [
          { slug: req.params.slug, status: "published" },
          { slug: req.params.slug, author: user.id },
        ];
      } else {
        filter.status = "published";
      }
    }

    const post = await BlogPost.findOne(filter)
      .populate("author", "name avatar")
      .select("-comments.status -isDeleted")
      .lean();

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }
    return res.json({ status: true, data: post });
  });

  // GET /admin/posts/:id (admin only)
  static findById = catchAsync(async (req: Request, res: Response) => {
    const post = await BlogPost.findById(req.params.id)
      .populate("author", "name avatar")
      .select("-comments.status -isDeleted")
      .lean();

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }
    // Attach current userId if available
    const userId = req.user?.id || null;
    return res.json({
      status: true,
      data: {
        ...post,
        reactions: post.reactions,
        reactionsByUser: post.reactionsByUser,
        currentUserId: userId,
      },
    });
  });

  // POST /posts (admin)
  static create = catchAsync(async (req: Request, res: Response) => {
    let payload = await createPostSchema.parseAsync(req.body);
    const author = req?.user?.id;
    // Generate/normalize slug if needed
    const slug = payload.slug ? payload.slug : slugify(payload.title);

    const exists = await BlogPost.findOne({ slug });
    if (exists) return res.status(409).json({ message: "Slug already exists" });

    const post = await BlogPost.create({ ...payload, slug, author });

    // If scheduled in the past, pre‑save hook will publish it
    return res
      .status(201)
      .json({ message: "Post created successfully", data: post });
  });

  // PUT /posts/:id (admin) — full update
  static update = catchAsync(async (req: Request, res: Response) => {
    const payload = await updatePostSchema.parseAsync(req.body);
    const data = pick(payload, ALLOWED_UPDATE_FIELDS);

    if (data.slug) {
      const exists = await BlogPost.findOne({
        slug: data.slug,
        _id: { $ne: req.params.id },
      });
      if (exists)
        return res.status(409).json({ message: "Slug already exists" });
    }

    const updatedPost = await BlogPost.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedPost) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    return res.json({
      status: true,
      message: "Post updated",
      data: updatedPost,
    });
  });

  // PATCH /posts/:id/publish (admin)
  static publish = catchAsync(async (req: Request, res: Response) => {
    const post = await BlogPost.findById(req.params.id);
    if (!post)
      return res.status(404).json({ status: false, message: "Post not found" });

    post.status = "published";
    post.publishedAt = new Date();
    await post.save();

    // Optional: trigger Next.js revalidation
    // await fetch(process.env.REVALIDATE_URL!, { method: "POST", body: JSON.stringify({ tag: "blog" }) });

    return res.json({ status: true, message: "Post published", data: post });
  });

  // PATCH /posts/:id/schedule (admin)  body: { scheduledFor: ISO }
  static schedule = catchAsync(async (req: Request, res: Response) => {
    const { scheduledFor } = req.body;
    if (!scheduledFor)
      return res.status(400).json({ message: "scheduledFor required" });

    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { status: "scheduled", scheduledFor },
      { new: true }
    );
    if (!post)
      return res.status(404).json({ status: false, message: "Post not found" });
    return res.json({ status: true, message: "Post scheduled", data: post });
  });

  // PATCH /posts/:id/feature (admin) body: { isFeatured: boolean }
  static toggleFeature = catchAsync(async (req: Request, res: Response) => {
    const { isFeatured } = req.body;
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { isFeatured: !!isFeatured },
      { new: true }
    );
    if (!post)
      return res.status(404).json({ status: false, message: "Post not found" });
    return res.json({ status: true, message: "Post updated", data: post });
  });

  // DELETE /posts/:id (admin) — soft delete
  static remove = catchAsync(async (req: Request, res: Response) => {
    const deleted = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!deleted) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }
    return res.json({ status: true, message: "Post deleted" });
  });

  // POST /posts/:id/view (public)
  static addView = catchAsync(async (req: Request, res: Response) => {
    await BlogPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    return res.json({ status: true });
  });

  // POST /posts/:id/react (public/auth) — support multiple reaction types
  static react = catchAsync(async (req: Request, res: Response) => {
    const { type } = req.body as { type: string };
    const allowed = ["like", "love", "clap", "wow"];
    if (!type || !allowed.includes(type)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid reaction type" });
    }
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ status: false, message: "Unauthorized" });
    const post = await BlogPost.findById(req.params.id);
    if (!post)
      return res.status(404).json({ status: false, message: "Post not found" });

    // Remove previous reaction by user if exists
    const prev = post.reactionsByUser.find((r) => r.user.toString() === userId);
    if (prev) {
      // Decrement previous type count
      if (post.reactions[prev.type] > 0) post.reactions[prev.type] -= 1;
      prev.type = type;
    } else {
      post.reactionsByUser.push({
        user: userId as any,
        type,
      });
    }
    // Increment new type count
    post.reactions[type] = (post.reactions[type] || 0) + 1;
    await post.save();
    return res.json({
      status: true,
      reactions: post.reactions,
      userReaction: type,
    });
  });

  // ----- Comments -----
  // POST /posts/:id/comments
  static addComment = catchAsync(async (req: Request, res: Response) => {
    // const post = await BlogPost.findById(req.params.id);
    // should use slug or id meaning the id can be a slug or id
    // implements

    const post = await BlogPost.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
      isDeleted: false,
    });

    console.log(post, req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!post.allowComments)
      return res.status(400).json({ message: "Comments disabled" });

    const data = await commentSchema.parseAsync(req.body);
    post.comments.push({
      author: (data.author as any) ?? null,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      content: data.content,
      status: "approved", // auto-approve for instant display
      likes: 0,
    });
    await post.save();
    return res
      .status(201)
      .json({ status: true, message: "Comment submitted for review" });
  });

  // PATCH /posts/:id/comments/:commentId (admin) — approve/spam/delete
  static moderateComment = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body as {
      status: "approved" | "pending" | "spam" | "deleted";
    };

    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Find subdoc manually
    const comment = post.comments.find(
      (c: any) => c._id?.toString() === req.params.commentId
    );

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.status = status;
    await post.save();
    return res.json({ status: true, message: "Comment updated" });
  });

  static listAllComments = catchAsync(async (req: Request, res: Response) => {
    const {
      status = "pending",
      page = "1",
      limit = "20",
      search,
      slug,
    } = req.query as Record<string, string>;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const pipeline: PipelineStage[] = [];

    pipeline.push({ $match: { isDeleted: false } });
    if (slug) pipeline.push({ $match: { slug } });

    // use object form for $unwind to satisfy typings

    pipeline.push({ $unwind: { path: "$comments" } });

    if (status && status !== "all") {
      pipeline.push({ $match: { "comments.status": status } });
    }

    if (search) {
      pipeline.push({
        $match: { "comments.content": { $regex: search, $options: "i" } },
      });
    }

    pipeline.push({ $sort: { "comments.createdAt": -1 } });

    pipeline.push({
      $project: {
        _id: 0,
        postId: "$_id",
        postSlug: "$slug",
        postTitle: "$title",
        comment: "$comments",
      },
    });

    const [items, totalArr] = await Promise.all([
      BlogPost.aggregate([...pipeline, { $skip: skip }, { $limit: limitNum }]),
      BlogPost.aggregate([...pipeline, { $count: "count" }]),
    ]);

    const totalCount = totalArr[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));

    return res.json({
      status: true,
      data: items, // [{ postId, postSlug, postTitle, comment }]
      meta: {
        totalCount,
        pageSize: limitNum,
        currentPage: pageNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  });

  static listComments = catchAsync(async (req: Request, res: Response) => {
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      isDeleted: false,
    })
      .select("comments")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comments = (post.comments || []).filter(
      (c: any) => c.status === "approved"
    );
    return res.json({ status: true, data: comments });
  });

  static scheduled = catchAsync(async (req: Request, res: Response) => {
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(Date.now() - 15 * 864e5);
    const to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(Date.now() + 45 * 864e5);
    const posts = await BlogPost.find({
      isDeleted: false,
      status: "scheduled",
      scheduledFor: { $gte: from, $lte: to },
    })
      .select("title slug scheduledFor")
      .lean();
    res.json({ status: true, data: posts });
  });
}
