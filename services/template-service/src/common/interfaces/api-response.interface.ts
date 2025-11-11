export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
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
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message: message || 'Operation successful',
    };
  }

  static error(error: string, message?: string): ApiResponse {
    return {
      success: false,
      error,
      message: message || 'Operation failed',
    };
  }

  static paginated<T>(
    data: T,
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): ApiResponse<T> {
    const total_pages = Math.ceil(total / limit);
    const has_next = page < total_pages;
    const has_previous = page > 1;

    return {
      success: true,
      data,
      message: message || 'Data retrieved successfully',
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
