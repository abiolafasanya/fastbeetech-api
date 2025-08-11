interface PaginationMeta {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

interface PaginateModel<T> {
  countDocuments(query: unknown): Promise<number>;
  find(query: unknown): {
    skip(skip: number): {
      limit(limit: number): Promise<T[]>;
    };
  };
}

export const paginate = async <T>(
  model: PaginateModel<T>,
  query: unknown,
  page: number = 1,
  limit: number = 10
): Promise<PaginationResult<T>> => {
  const skip = (page - 1) * limit;
  const totalCount = await model.countDocuments(query);
  const data = await model.find(query).skip(skip).limit(limit);

  const totalPages = Math.ceil(totalCount / limit);

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
};
