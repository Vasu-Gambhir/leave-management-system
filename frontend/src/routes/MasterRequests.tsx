import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import toast from "react-hot-toast";

interface AdminRequest {
  id: string;
  requested_at: string;
  expires_at: string;
  status: string;
  approval_token: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
  organizations: {
    id: string;
    name: string;
    domain: string;
  };
}

export function MasterRequests() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadRequests();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadRequests = async () => {
    try {
      const response = await api.get("/master/admin-requests");
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Error loading admin requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const wsUrl = `${import.meta.env.VITE_WS_URL}?token=${encodeURIComponent(
      token
    )}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (
          message.type === "master_update" &&
          message.data.type === "new_admin_request"
        ) {
          const { request } = message.data;

          // Add the new request to the list
          const newRequest: AdminRequest = {
            id: request.id,
            requested_at: request.requested_at,
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(), // 24 hours from now
            status: "pending",
            approval_token: "", // We don't need this for display
            users: request.user,
            organizations: request.organization,
          };

          setRequests((prev) => [newRequest, ...prev]);

          // Show notification
          toast.success(
            `New admin request from ${request.user.name} at ${request.organization.name}`,
            { duration: 6000 }
          );
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);

      // Reconnect after 3 seconds
      setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleRequest = async (
    requestId: string,
    token: string,
    action: "approve" | "deny"
  ) => {
    setProcessing(requestId);
    try {
      await api.post("/admin-requests/process", {
        token,
        action,
      });

      setRequests((requests) => requests.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error("Error processing request:", error);
      alert("Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-100 border-t-indigo-600 shadow-2xl"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl">
        <Link
          to="/master-dashboard"
          className="text-white hover:text-indigo-200 mb-4 inline-flex items-center font-semibold transition-all duration-200"
        >
          <span className="mr-2">←</span>
          Back to Master Dashboard
        </Link>
        <h1 className="text-4xl font-bold tracking-tight flex items-center">
          <span className="text-5xl mr-4">📬</span>
          Admin Requests Management
        </h1>
        <p className="mt-3 text-xl text-indigo-100 font-medium leading-relaxed">
          Review and process admin access requests from organizations
        </p>
        <div className="mt-4 flex items-center space-x-4">
          <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
            <span className="animate-pulse mr-2">🔐</span>
            First admin approval system
          </div>
          <div
            className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold ${
              isConnected
                ? "bg-green-500/20 text-green-100"
                : "bg-red-500/20 text-red-100"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            {isConnected ? "Live Updates" : "Disconnected"}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
        <ul className="divide-y divide-gray-100">
          {requests.length > 0 ? (
            requests.map((request) => (
              <li
                key={request.id}
                className="px-8 py-8 hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md mr-4">
                      <span className="text-lg font-semibold text-white">
                        {request.users.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="mr-2">👤</span>
                        {request.users.name}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <span className="mr-2">✉️</span>
                        {request.users.email}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-md">
                    ⏳ PENDING
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center">
                      <span className="mr-2">🏢</span>
                      Organization
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {request.organizations.name}
                    </p>
                    <p className="text-sm text-blue-600 flex items-center mt-1">
                      <span className="mr-1">🌐</span>
                      {request.organizations.domain}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center">
                      <span className="mr-2">📅</span>
                      Requested
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-green-600">
                      {new Date(request.requested_at).toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-100">
                    <p className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center">
                      <span className="mr-2">⏰</span>
                      Expires
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatTimeRemaining(request.expires_at)}
                    </p>
                    <p className="text-sm text-red-600">
                      {new Date(request.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">👑</span>
                    <div>
                      <h4 className="text-sm font-bold text-blue-800 mb-2">
                        First Admin Request
                      </h4>
                      <p className="text-sm text-blue-700 font-medium leading-relaxed">
                        This organization currently has no admins. Approving
                        this request will make{" "}
                        <span className="font-bold">{request.users.name}</span>{" "}
                        the first admin for{" "}
                        <span className="font-bold">
                          {request.organizations.name}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
                  <button
                    onClick={() =>
                      handleRequest(request.id, request.approval_token, "deny")
                    }
                    disabled={processing === request.id}
                    className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
                  >
                    {processing === request.id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    )}
                    {processing === request.id
                      ? "Processing..."
                      : "❌ Deny Request"}
                  </button>
                  <button
                    onClick={() =>
                      handleRequest(
                        request.id,
                        request.approval_token,
                        "approve"
                      )
                    }
                    disabled={processing === request.id}
                    className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
                  >
                    {processing === request.id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    )}
                    {processing === request.id
                      ? "Processing..."
                      : "✅ Approve Request"}
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="px-8 py-16 text-center">
              <div className="text-gray-400 text-8xl mb-6">📬</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                No Pending Requests
              </h3>
              <p className="text-gray-600 text-lg font-medium mb-2">
                Admin access requests from organizations will appear here.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 mt-6 max-w-md mx-auto">
                <p className="text-sm text-blue-700 font-medium flex items-center justify-center">
                  <span className="mr-2">💡</span>
                  Only first admin requests (from organizations with no existing
                  admins) are sent to the master user.
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {requests.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md mr-4">
              <span className="text-white text-2xl">💡</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-yellow-800 mb-3 flex items-center">
                Important Notes:
              </h4>
              <ul className="text-sm text-yellow-700 space-y-2 font-medium">
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">🔸</span>
                  These are first admin requests from organizations with no
                  existing admins
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">🔸</span>
                  Once approved, future requests will go to the organization's
                  admins
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">🔸</span>
                  Requests expire after 24 hours and users can submit new
                  requests
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">🔸</span>
                  Users can only submit one request per 24 hours
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
