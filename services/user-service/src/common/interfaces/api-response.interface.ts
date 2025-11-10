// Standard API Response format (snake_case as required)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export class ResponseFormatter {
  static success<T>(
    data: T,
    message: string = 'Success',
    meta: Partial<PaginationMeta> = {},
  ): ApiResponse<T> {
    const defaultMeta: PaginationMeta = {
      total: 0,
      limit: 10,
      page: 1,
      total_pages: 0,
      has_next: false,
      has_previous: false,
      ...meta,
    };

    return {
      success: true,
      data,
      message,
      meta: defaultMeta,
    };
  }

  static error(
    error: string,
    message: string = 'Error occurred',
    meta: Partial<PaginationMeta> = {},
  ): ApiResponse {
    const defaultMeta: PaginationMeta = {
      total: 0,
      limit: 10,
      page: 1,
      total_pages: 0,
      has_next: false,
      has_previous: false,
      ...meta,
    };

    return {
      success: false,
      error,
      message,
      meta: defaultMeta,
    };
  }

  static paginated<T>(
    data: T,
    total: number,
    page: number,
    limit: number,
    message: string = 'Success',
  ): ApiResponse<T> {
    const total_pages = Math.ceil(total / limit);
    const has_next = page < total_pages;
    const has_previous = page > 1;

    return {
      success: true,
      data,
      message,
      meta: {
        total,
        limit,
        page,
        total_pages,
        has_next,
        has_previous,
      },
    };
  }
}
