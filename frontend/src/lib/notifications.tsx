import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import toast from "react-hot-toast";
import { notificationsAPI, type NotificationData } from "./api";
import { useAuth } from "./auth";

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  isConnected: boolean;
  showAudioPrompt: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const audioEnabled = useRef(false);

  const refreshNotifications = async () => {
    if (!user) return;

    try {
      const [notificationsResponse, unreadResponse] = await Promise.all([
        notificationsAPI.getNotifications({ limit: 50 }),
        notificationsAPI.getUnreadCount(),
      ]);

      setNotifications(notificationsResponse.data.notifications || []);
      setUnreadCount(unreadResponse.data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const connectWebSocket = () => {
    if (!user) return;

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL}?token=${encodeURIComponent(
      token
    )}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "connection":
            break;

          case "notification":
            handleNewNotification(message.data);
            break;

          case "user_update":
            if (message.data.type === "role_updated") {
              // Update the user data in localStorage and trigger auth refresh
              const { user: updatedUser } = message.data;
              localStorage.setItem("user", JSON.stringify(updatedUser));

              // Trigger a custom event to notify auth context
              window.dispatchEvent(
                new CustomEvent("userUpdated", {
                  detail: updatedUser,
                })
              );

              // Show toast notification
              toast.success(
                `Your role has been updated to ${updatedUser.role.replace(
                  "_",
                  " "
                )}`
              );
            }
            break;

          default:
        }
      } catch (error) {
        console.error("Web socket error", error);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);

      if (
        event.code !== 1000 &&
        reconnectAttempts.current < maxReconnectAttempts
      ) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connectWebSocket();
        }, delay);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleNewNotification = (notification: NotificationData) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    const notificationTypeEmoji = {
      leave_request: "📝",
      leave_approved: "✅",
      leave_rejected: "❌",
      admin_request_approved: "🎉",
      admin_request_denied: "❌",
    };

    const emoji = notificationTypeEmoji[notification.type] || "🔔";

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">{emoji}</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: "bottom-right",
      }
    );

    if (audioEnabled.current) {
      try {
        const audio = new Audio("/notification-sound.mp3");
        audio.volume = 0.3;

        audio
          .play()
          .then(() => {})
          .catch((error) => {
            console.error("notification audio error", error);
          });
      } catch (error) {
        console.error("Audio playing error", error);
      }
    } else {
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationsAPI.deleteNotification(id);

      const notification = notifications.find((n) => n.id === id);

      setNotifications((prev) => prev.filter((notif) => notif.id !== id));

      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  useEffect(() => {
    const events = ["click", "keydown", "touchstart", "mousedown"];

    const enableAudio = () => {
      if (!audioEnabled.current) {
        setShowAudioPrompt(false);

        try {
          const testAudio = new Audio("/notification-sound.mp3");
          testAudio.volume = 0.01;
          testAudio
            .play()
            .then(() => {
              audioEnabled.current = true;

              events.forEach((event) => {
                document.removeEventListener(event, enableAudio);
              });
            })
            .catch((error) => {
              console.error("Audio playing error", error);
            });
        } catch (error) {
          console.error("Audio playing error", error);
        }
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, enableAudio, { passive: true });
    });

    const promptTimeout = setTimeout(() => {
      if (!audioEnabled.current) {
        setShowAudioPrompt(true);
      }
    }, 3000);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, enableAudio);
      });
      clearTimeout(promptTimeout);
    };
  }, []);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      connectWebSocket();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);

      if (wsRef.current) {
        wsRef.current.close(1000, "User logged out");
        wsRef.current = null;
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    showAudioPrompt,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
