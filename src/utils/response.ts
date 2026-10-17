import type { Context } from "hono";
import type { ApiResponse } from "../types/index.js";

export const sendSuccess = <T>(
  c: Context,
  data: T,
  message: string = "Success",
  status: 200 | 201 = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return c.json(response, status);
};

export const sendError = (
  c: Context,
  message: string = "Something went wrong",
  status: 400 | 401 | 403 | 404 | 409 | 500 = 500,
  error?: unknown
) => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error ? { error } : {}),
  };
  return c.json(response, status);
};
