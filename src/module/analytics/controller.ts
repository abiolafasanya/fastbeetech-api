// controllers/blogAnalytics.ts
import { Request, Response } from "express";
import { startOfDay } from "date-fns";
import { PostEvent } from "./model";

// helper: get count for a given type from `$items`
const countFor = (type: string) => ({
  $let: {
    vars: {
      item: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$items",
              as: "i",
              cond: { $eq: ["$$i.k", type] },
            },
          },
          0,
        ],
      },
    },
    in: { $ifNull: ["$$item.v", 0] },
  },
});

export class BlogAnalyticsController {
  static capture = async (req: Request, res: Response) => {
    const { postId, type, sessionId } = req.body as {
      postId: string;
      type: string;
      sessionId?: string;
    };
    if (!postId || !type)
      return res
        .status(400)
        .json({ status: false, message: "postId & type required" });

    await PostEvent.create({
      postId,
      type,
      sessionId:
        sessionId || (req.headers["x-session-id"] as string | undefined),
      ua: req.headers["user-agent"],
      ip: req.ip,
    });
    return res.json({ status: true });
  };

  // simple on-the-fly aggregate for a range
  static overview = async (req: Request, res: Response) => {
    const from = req.query.from
      ? new Date(String(req.query.from))
      : startOfDay(new Date(Date.now() - 29 * 864e5));
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const match = { createdAt: { $gte: from, $lte: to } };

    const series = await PostEvent.aggregate([
      { $match: match },
      {
        $project: {
          postId: 1,
          type: 1,
          day: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
        },
      },
      { $group: { _id: { day: "$day", type: "$type" }, count: { $sum: 1 } } },
      {
        $group: {
          _id: "$_id.day",
          items: { $push: { k: "$_id.type", v: "$count" } },
        },
      },
      {
        $project: {
          _id: 0,
          day: "$_id",
          views: countFor("view"),
          reads: countFor("read_start"),
          completions: countFor("read_complete"),
          likes: countFor("like"),
          shares: countFor("share"),
        },
      },
      { $sort: { day: 1 } },
    ]);

    const totals = series.reduce(
      (a: any, d: any) => ({
        views: a.views + d.views,
        reads: a.reads + d.reads,
        completions: a.completions + d.completions,
        likes: a.likes + d.likes,
        shares: a.shares + d.shares,
      }),
      { views: 0, reads: 0, completions: 0, likes: 0, shares: 0 }
    );

    const completionRate = totals.reads
      ? +((totals.completions / totals.reads) * 100).toFixed(1)
      : 0;

    return res.json({ status: true, data: { series, totals, completionRate } });
  };

  static top = async (req: Request, res: Response) => {
    const { limit = 10 } = req.query as any;
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const items = await PostEvent.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, type: "view" } },
      { $group: { _id: "$postId", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: Number(limit) },
    ]);
    return res.json({ status: true, data: items });
  };
}
