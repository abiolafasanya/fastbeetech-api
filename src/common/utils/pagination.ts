// pagination.ts
import type {
  FilterQuery,
  PopulateOptions,
  QueryOptions,
  Model,
} from "mongoose";

interface PaginationMeta {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export type Sort =
  | string
  | { [key: string]: 1 | -1 }
  | [string, 1 | -1][]
  | undefined;

type Select = string | Record<string, unknown> | undefined;

interface PaginateOptions<T> {
  page?: number;
  limit?: number;
  sort?: Sort;
  select?: Select;
  populate?: PopulateOptions | PopulateOptions[];
  lean?: boolean;
  queryOptions?: QueryOptions; // rare: hint, readConcern, etc.
}

/**
 * Mongoose-friendly paginate with sort/select/populate/lean.
 */
export async function paginate<T>(
  model: Model<T>,
  query: FilterQuery<T>,
  opts: PaginateOptions<T> = {}
): Promise<PaginationResult<T>> {
  const {
    page = 1,
    limit = 10,
    sort,
    select,
    populate,
    lean = true,
    queryOptions,
  } = opts;

  const skip = (page - 1) * limit;

  const totalCount = await model.countDocuments(query);

  let q = model.find(query, undefined, queryOptions).skip(skip).limit(limit);

  if (sort) q = q.sort(sort as any);
  if (select) q = q.select(select as any);
  if (populate) q = q.populate(populate as any);
  if (lean) (q as any) = q.lean();

  const data = (await q) as unknown as T[];

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    data,
    meta: {
      totalCount,
      pageSize: limit,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
