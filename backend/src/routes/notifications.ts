import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { supabase } from "../services/supabaseClient.js";
import {
  websocketManager,
  NotificationData,
} from "../services/websocketManager.js";
import { HTTPException } from "hono/http-exception";

const notifications = new Hono();

notifications.get("/", authenticate, async (c) => {
  try {
    const user = c.get("user");
    const { page = 1, limit = 20, unread_only = false } = c.req.query();

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from("notifications")
      .select(
        `
        id,
        type,
        title,
        message,
        data,
        read,
        created_at,
        sender:users!notifications_sender_id_fkey (
          id,
          name,
          email,
          profile_picture
        )
      `
      )
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (unread_only === "true") {
      query = query.eq("read", false);
    }

    const { data: notificationsData, error, count } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      throw new HTTPException(500, {
        message: "Failed to fetch notifications",
      });
    }

    return c.json({
      notifications: notificationsData || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        hasMore: count ? offset + limitNum < count : false,
      },
    });
  } catch (error: any) {
    console.error("Error in get notifications:", error);
    throw new HTTPException(500, {
      message: error.message || "Failed to fetch notifications",
    });
  }
});

notifications.get("/unread-count", authenticate, async (c) => {
  try {
    const user = c.get("user");

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("recipient_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("Error fetching unread count:", error);
      throw new HTTPException(500, { message: "Failed to fetch unread count" });
    }

    return c.json({ unreadCount: count || 0 });
  } catch (error: any) {
    console.error("Error in get unread count:", error);
    throw new HTTPException(500, {
      message: error.message || "Failed to fetch unread count",
    });
  }
});

notifications.patch("/:id/read", authenticate, async (c) => {
  try {
    const user = c.get("user");
    const notificationId = c.req.param("id");

    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("recipient_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error marking notification as read:", error);
      throw new HTTPException(500, {
        message: "Failed to mark notification as read",
      });
    }

    if (!data) {
      throw new HTTPException(404, { message: "Notification not found" });
    }

    return c.json({
      message: "Notification marked as read",
      notification: data,
    });
  } catch (error: any) {
    console.error("Error in mark notification as read:", error);
    throw new HTTPException(500, {
      message: error.message || "Failed to mark notification as read",
    });
  }
});

notifications.patch("/mark-all-read", authenticate, async (c) => {
  try {
    const user = c.get("user");

    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      throw new HTTPException(500, {
        message: "Failed to mark all notifications as read",
      });
    }

    return c.json({ message: "All notifications marked as read" });
  } catch (error: any) {
    console.error("Error in mark all notifications as read:", error);
    throw new HTTPException(500, {
      message: error.message || "Failed to mark all notifications as read",
    });
  }
});

notifications.delete("/:id", authenticate, async (c) => {
  try {
    const user = c.get("user");
    const notificationId = c.req.param("id");

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("Error deleting notification:", error);
      throw new HTTPException(500, {
        message: "Failed to delete notification",
      });
    }

    return c.json({ message: "Notification deleted successfully" });
  } catch (error: any) {
    console.error("Error in delete notification:", error);
    throw new HTTPException(500, {
      message: error.message || "Failed to delete notification",
    });
  }
});

export async function createNotification(
  recipientId: string,
  senderId: string | null,
  type: NotificationData["type"],
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        recipient_id: recipientId,
        sender_id: senderId,
        type,
        title,
        message,
        data: data || {},
        read: false,
      })
      .select(
        `
        id,
        type,
        title,
        message,
        data,
        created_at,
        sender:users!notifications_sender_id_fkey (
          id,
          name,
          email,
          profile_picture
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return null;
    }

    const notificationData: NotificationData = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.created_at,
    };

    websocketManager.sendNotificationToUser(recipientId, notificationData);

    return notification;
  } catch (error) {
    console.error("Error in createNotification:", error);
    return null;
  }
}

export default notifications;
