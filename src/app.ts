import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { sendError } from "./utils/response.js";

// Module routes
import { authRoutes } from "./modules/auth/auth.routes.js";
import { productsRoutes } from "./modules/products/products.routes.js";
import { categoriesRoutes } from "./modules/categories/categories.routes.js";
import { cartRoutes } from "./modules/cart/cart.routes.js";
import { ordersRoutes } from "./modules/orders/orders.routes.js";
import { paymentsRoutes } from "./modules/payments/payments.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { uploadsRoutes } from "./modules/uploads/uploads.routes.js";
import { colorsRoutes } from "./modules/colors/colors.routes.js";
import { sizesRoutes } from "./modules/sizes/sizes.routes.js";
import { carouselsRoutes } from "./modules/carousels/carousels.routes.js";
import { settingsRoutes } from "./modules/settings/settings.routes.js";

export const app = new Hono();

// Global Middlewares
app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow localhost dev or production client URL
      if (!origin || origin.includes("localhost") || origin === env.CLIENT_URL) {
        return origin || "*";
      }
      return env.CLIENT_URL;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "StyleFox API",
    timestamp: new Date().toISOString(),
  });
});

// API Routes (v1)
const api = new Hono();
api.route("/auth", authRoutes);
api.route("/products", productsRoutes);
api.route("/categories", categoriesRoutes);
api.route("/colors", colorsRoutes);
api.route("/sizes", sizesRoutes);
api.route("/cart", cartRoutes);
api.route("/orders", ordersRoutes);
api.route("/payments", paymentsRoutes);
api.route("/users", usersRoutes);
api.route("/uploads", uploadsRoutes);
api.route("/carousels", carouselsRoutes);
api.route("/settings", settingsRoutes);

app.route("/api/v1", api);

// 404 Handler
app.notFound((c) => {
  return sendError(c, `Not Found - ${c.req.method} ${c.req.url}`, 404);
});

// Global Error Handler
app.onError(errorHandler);
