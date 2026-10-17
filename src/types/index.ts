export interface UserPayload {
  id: string;
  email: string;
  role: "admin" | "customer";
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
