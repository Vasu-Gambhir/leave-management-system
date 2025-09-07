import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { supabase } from "../services/supabaseClient.js";
import { User } from "../types/index.js";
import { cacheService } from "../services/cacheService.js";

export const authenticate = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };

    // Always fetch fresh user data to ensure role is up-to-date
    // No caching for user sessions to prevent stale role/permission issues
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      throw new HTTPException(401, { message: "Invalid token" });
    }

    c.set("user", user as User);
    await next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HTTPException(401, { message: "Invalid token" });
    }
    throw error;
  }
};

export const requireRole = (requiredRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as User;
    if (!user) {
      throw new HTTPException(401, { message: "Not authenticated" });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }

    await next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireApprovalManager = requireRole([
  "admin",
  "approval_manager",
]);
