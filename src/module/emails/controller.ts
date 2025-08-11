import { Request, Response } from "express";
import { EmailLog } from "./model";
import { paginate } from "../../common/utils/pagination";

export const EmailLogController = {
  getLogs: async (req: Request, res: Response) => {
    const {
      user,
      type,
      status,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query as Record<string, string>;

    const query: any = {};

    if (user) query.user = user;
    if (type) query.type = type;
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

   const response = await paginate(EmailLog, query, +page, +limit)

    res.json({
      status: true,
      ...response
      
    });
  },
};
