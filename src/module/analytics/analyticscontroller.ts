import { Request, Response } from "express";
import catchAsync from "../../shared/request";
import { BlogPost } from "../blog/model"; // adjust path to your BlogPost model

export const AdminStatsController = {
  overview: catchAsync(async (_req: Request, res: Response) => {
    const [
      totalPosts,
      draftCount,
      scheduledCount,
      publishedCount,
      archivedCount,
      featuredCount,
      commentsAgg,
      latestPosts,
      latestComments,
    ] = await Promise.all([
      BlogPost.countDocuments({ isDeleted: false }),
      BlogPost.countDocuments({ isDeleted: false, status: "draft" }),
      BlogPost.countDocuments({ isDeleted: false, status: "scheduled" }),
      BlogPost.countDocuments({ isDeleted: false, status: "published" }),
      BlogPost.countDocuments({ isDeleted: false, status: "archived" }),
      BlogPost.countDocuments({
        isDeleted: false,
        status: "published",
        isFeatured: true,
      }),


      // comments breakdown across all posts
      BlogPost.aggregate([
        { $match: { isDeleted: false } },
        {
          $project: {
            approved: {
              $size: {
                $filter: {
                  input: "$comments",
                  as: "c",
                  cond: { $eq: ["$$c.status", "approved"] },
                },
              },
            },
            pending: {
              $size: {
                $filter: {
                  input: "$comments",
                  as: "c",
                  cond: { $eq: ["$$c.status", "pending"] },
                },
              },
            },
            spam: {
              $size: {
                $filter: {
                  input: "$comments",
                  as: "c",
                  cond: { $eq: ["$$c.status", "spam"] },
                },
              },
            },
            deleted: {
              $size: {
                $filter: {
                  input: "$comments",
                  as: "c",
                  cond: { $eq: ["$$c.status", "deleted"] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            approved: { $sum: "$approved" },
            pending: { $sum: "$pending" },
            spam: { $sum: "$spam" },
            deleted: { $sum: "$deleted" },
          },
        },
      ]),

      // latest posts (admin view)
      BlogPost.find({ isDeleted: false })
        .select("title slug status publishedAt createdAt author")
        .populate("author", "name avatar")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // latest comments across posts
      BlogPost.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: "$comments" },
        { $sort: { "comments.createdAt": -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            postId: "$_id",
            postSlug: "$slug",
            postTitle: "$title",
            comment: "$comments",
          },
        },
      ]),
    ]);

    const c = commentsAgg[0] ?? {
      approved: 0,
      pending: 0,
      spam: 0,
      deleted: 0,
    };
    const totalComments = c.approved + c.pending + c.spam + c.deleted;

    return res.json({
      status: true,
      data: {
        counts: {
          totalPosts,
          draftCount,
          scheduledCount,
          publishedCount,
          archivedCount,
          featuredCount,
          comments: {
            total: totalComments,
            approved: c.approved,
            pending: c.pending,
            spam: c.spam,
            deleted: c.deleted,
          },
        },
        latest: {
          posts: latestPosts,
          comments: latestComments,
        },
      },
    });
  }),
};
