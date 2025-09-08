import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { createServer } from "http";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { config } from "./config/index.js";
import { websocketManager } from "./services/websocketManager.js";
import { redisClient } from "./services/redisClient.js";

import auth from "./routes/auth.js";
import leaves from "./routes/leaves.js";
import leaveTypes from "./routes/leaveTypes.js";
import organizations from "./routes/organizations.js";
import adminRequests from "./routes/adminRequests.js";
import master from "./routes/master.js";
import profile from "./routes/profile.js";
import notifications from "./routes/notifications.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000",
      "https://leave-management-system-prod.vercel.app"
    ],
    credentials: true,
  })
);

app.get("/", (c) => c.text("Leave Management API - Hono"));
app.get("/health", (c) =>
  c.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
);

app.route("/api/auth", auth);
app.route("/api/leaves", leaves);
app.route("/api/leave-types", leaveTypes);
app.route("/api/organizations", organizations);
app.route("/api/admin-requests", adminRequests);
app.route("/api/master", master);
app.route("/api/profile", profile);
app.route("/api/notifications", notifications);

// Remove static serving if no public folder needed
// app.use("/static/*", serveStatic({ root: "./public" }));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

const port = parseInt(config.PORT);

async function startServer() {
  try {
    await redisClient.connect();

    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`🔌 WebSocket server available at ws://localhost:${port}`);

    // Start the Hono server
    const server = serve({
      fetch: app.fetch,
      port,
    });
    
    // Type assertion to handle the server type properly
    const httpServer = server as unknown as ReturnType<typeof createServer>;
    
    // Initialize WebSocket on the same server
    websocketManager.initialize(httpServer);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await redisClient.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await redisClient.disconnect();
  process.exit(0);
});
