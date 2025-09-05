import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { config } from "./config/index.js";

// Import routes
import auth from "./routes/auth.js";
import leaves from "./routes/leaves.js";
import leaveTypes from "./routes/leaveTypes.js";
import organizations from "./routes/organizations.js";
import adminRequests from "./routes/adminRequests.js";
import master from "./routes/master.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// Routes
app.get("/", (c) => c.text("Leave Management API - Hono"));
app.get("/health", (c) =>
  c.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
);

// API Routes
app.route("/api/auth", auth);
app.route("/api/leaves", leaves);
app.route("/api/leave-types", leaveTypes);
app.route("/api/organizations", organizations);
app.route("/api/admin-requests", adminRequests);
app.route("/api/master", master);

console.log("📡 All API routes registered:");

// Static files
app.use("/static/*", serveStatic({ root: "./public" }));

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

const port = parseInt(config.PORT);
console.log(`🚀 Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
