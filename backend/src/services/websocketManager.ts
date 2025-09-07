import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  organizationId: string;
}

export interface NotificationData {
  id: string;
  type:
    | "leave_request"
    | "leave_approved"
    | "leave_rejected"
    | "admin_request_approved"
    | "admin_request_denied";
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, Set<AuthenticatedWebSocket>>();

  initialize(server: Server) {
    this.wss = new WebSocketServer({
      server,
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private verifyClient(info: any): boolean {
    try {
      const url = new URL(info.req.url, "ws://localhost");
      const token = url.searchParams.get("token");

      if (!token) {
        return false;
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      if (!decoded.userId) {
        return false;
      }

      info.req.userId = decoded.userId;
      info.req.organizationId = decoded.organizationId;

      return true;
    } catch (error) {
      console.log("Error in verififying client", error);
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: any) {
    const userId = req.userId;
    const organizationId = req.organizationId;

    ws.userId = userId;
    ws.organizationId = organizationId;

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);

    this.sendToUser(userId, {
      type: "connection",
      message: "Connected to real-time notifications",
    });

    ws.on("close", () => {
      const userClients = this.clients.get(userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(userId);
        }
      }
    });

    ws.on("pong", () => {});

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    ws.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });
  }

  private handleClientMessage(ws: AuthenticatedWebSocket, data: any) {
    switch (data.type) {
      case "mark_notification_read":
        break;
      default:
    }
  }

  sendNotificationToUser(userId: string, notification: NotificationData) {
    this.sendToUser(userId, {
      type: "notification",
      data: notification,
    });
  }

  sendUserUpdate(userId: string, updateData: any) {
    this.sendToUser(userId, {
      type: "user_update",
      data: updateData,
    });
  }

  async sendMasterUpdate(data: any) {
    try {
      const { supabase } = await import("../services/supabaseClient.js");
      const { config } = await import("../config/index.js");
      
      // Find master user ID
      const { data: masterUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", config.MASTER_EMAIL)
        .single();

      if (masterUser) {
        this.sendToUser(masterUser.id, {
          type: "master_update",
          data: data,
        });
      }
    } catch (error) {
      console.error("Error sending master update:", error);
    }
  }

  private sendToUser(userId: string, message: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const messageStr = JSON.stringify(message);
      userClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    } else {
    }
  }

  sendNotificationToUsers(userIds: string[], notification: NotificationData) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  getActiveUserCount(): number {
    return this.clients.size;
  }

  getActiveConnectionsCount(): number {
    let count = 0;
    this.clients.forEach((userClients) => {
      count += userClients.size;
    });
    return count;
  }

  isUserOnline(userId: string): boolean {
    const userClients = this.clients.get(userId);
    return userClients ? userClients.size > 0 : false;
  }
}

export const websocketManager = new WebSocketManager();
