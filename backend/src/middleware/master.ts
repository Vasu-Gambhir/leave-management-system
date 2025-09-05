import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { config } from "../config/index.js";

export const requireMaster = async (c: Context, next: Next) => {
  const user = c.get("user");
  
  if (!user) {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  // Check if user is the master user
  if (user.email?.toLowerCase() !== config.MASTER_EMAIL?.toLowerCase()) {
    throw new HTTPException(403, { 
      message: "Access denied. Master privileges required." 
    });
  }

  await next();
};