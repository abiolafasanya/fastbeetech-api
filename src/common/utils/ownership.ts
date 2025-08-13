// utils/ownership.ts
import { Request, Response, NextFunction } from "express";
import { BlogPost } from "../../module/blog/model";

export const ensureOwnerOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user!;
  if (user.role === "admin") return next();

  const post = await BlogPost.findById(req.params.id).select("author").lean();
  if (!post) return res.status(404).json({ message: "Post not found" });

  if (String(post.author) !== user.id) {
    return res
      .status(403)
      .json({ message: "Only the owner or admin can modify this post" });
  }
  return next();
};
