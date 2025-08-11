import { Request, Response } from "express";
import catchAsync from "../../shared/request";
import { BlogPost } from "./model";
import { paginate } from "../../common/utils/pagination";
import createPostSchema from "./validation/blog";

export class BlogPostController {
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
    } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (tag) filter.tags = tag;
    if (author) filter.author = author;
    if (featured === "true") filter.isFeatured = true;

    if (trending === "true") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filter.createdAt = { $gte: weekAgo };
    }

    if (search) {
      filter.title = { $regex: search as string, $options: "i" };
    }

    // Paginate with filters
    const blogs = await paginate(BlogPost, filter, Number(page), Number(limit));

    // const posts = await BlogPost.find(filter).sort({ publishedAt: -1 });
    return res.json({ status: true, ...blogs });
  });

  static findOne = catchAsync(async (req: Request, res: Response) => {
    const post = await BlogPost.findOne({ slug: req.params.slug });
    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }
    return res.json({ status: true, data: post });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    try {
      const validatedData = createPostSchema.parseAsync(req.body);

      const post = await BlogPost.create(validatedData);

      res.status(201).json({
        message: "Post created successfully",
        data: post,
      });
    } catch (error) {
      res.status(500).json({ message: "Post creation failed", details: error });
    }
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const updatedPost = await BlogPost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    if (!updatedPost) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }
    return res.json({
      status: true,
      message: "Post updated",
      data: updatedPost,
    });
  });

  static remove = catchAsync(async (req: Request, res: Response) => {
    const deleted = await BlogPost.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }
    return res.json({ status: true, message: "Post deleted" });
  });
}
