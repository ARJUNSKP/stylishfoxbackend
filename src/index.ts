import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { warmUpDatabase } from "./config/database.js";

const port = env.PORT || 8000;

console.log(`
🦊 StyleFox Backend Server starting...
🚀 Environment: ${env.NODE_ENV}
📡 Port: ${port}
🔗 Health Check: http://localhost:${port}/health
`);

// Pre-warm database connection pool and ensure all tables exist
warmUpDatabase()
  .then(() => {
    console.log("⚡ Database connection pool verified and all tables ready");
  })
  .catch((err) => {
    console.error("❌ Failed to verify database tables:", err);
  });

serve({
  fetch: app.fetch,
  port,
});

export default app;
