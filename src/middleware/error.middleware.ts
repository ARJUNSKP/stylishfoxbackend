import type { Context } from "hono";
import { ZodError } from "zod";
import { sendError } from "../utils/response.js";

export const errorHandler = (err: Error, c: Context) => {
  console.error("🔥 Error caught by global error middleware:", err);

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return sendError(c, "Validation Failed", 400, formattedErrors);
  }

  return sendError(
    c,
    err.message || "Internal Server Error",
    500,
    process.env.NODE_ENV === "development" ? err.stack : undefined
  );
};
