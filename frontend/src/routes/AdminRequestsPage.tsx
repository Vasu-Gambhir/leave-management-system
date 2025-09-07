import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../lib/auth";
import { adminRequestsAPI } from "../lib/api";

interface AdminRequest {
  id: string;
  requested_at: string;
  expires_at: string;
  status: string;
  message?: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
}

export function AdminRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<"approve" | "deny">("approve");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (user?.role === "admin") {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await adminRequestsAPI.getPendingRequests();
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Error loading admin requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (
    request: AdminRequest,
    requestAction: "approve" | "deny"
  ) => {
    setSelectedRequest(request);
    setAction(requestAction);
    setReason("");
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(selectedRequest.id);
      await adminRequestsAPI.approveRequest({
        requestId: selectedRequest.id,
        action,
        reason: action === "deny" ? reason : undefined,
      });

      setShowModal(false);
      setSelectedRequest(null);
      setReason("");
      loadRequests();

      toast.success(
        `Request ${action === "approve" ? "approved" : "denied"} successfully!`
      );
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(error.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 px-4">
        <div className="bg-white shadow-2xl rounded-2xl p-8 border border-red-100 text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-900 mb-3">
            Access Denied
          </h2>
          <p className="text-red-700 font-medium">
            This page is only accessible to administrators.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 shadow-lg"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <span className="mr-3">📬</span>
          Admin Requests
        </h1>
        <p className="mt-2 text-lg text-gray-600 font-medium">
          Manage pending admin access requests for your organization
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white shadow-xl rounded-2xl p-12 text-center border border-gray-100">
          <div className="text-gray-400 text-8xl mb-6">📋</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            No pending requests
          </h3>
          <p className="text-gray-600 text-lg font-medium">
            There are currently no pending admin access requests.
          </p>
          <p className="text-gray-400 mt-2">
            Requests will appear here when users request admin access.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    👤 Requested By
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📅 Request Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ⏰ Expires
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💬 Message
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ⚙️ Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md mr-4">
                          <span className="text-lg font-semibold text-white">
                            {request.users.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {request.users.name}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center">
                            <span className="mr-1">✉️</span>
                            {request.users.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="bg-gray-100 px-3 py-1 rounded-lg inline-flex items-center">
                        <span className="mr-1">📅</span>
                        {formatDate(request.requested_at)}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={`text-sm font-semibold px-3 py-1 rounded-lg inline-flex items-center ${
                          new Date(request.expires_at) > new Date()
                            ? "text-green-700 bg-green-100"
                            : "text-red-700 bg-red-100"
                        }`}
                      >
                        <span className="mr-1">⏰</span>
                        {getTimeLeft(request.expires_at)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600 max-w-xs">
                      {request.message ? (
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <span className="truncate block">
                            {request.message}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No message</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() =>
                            handleRequestAction(request, "approve")
                          }
                          disabled={processing === request.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 px-3 py-1 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer font-semibold flex items-center"
                        >
                          <span className="mr-1">✅</span>
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(request, "deny")}
                          disabled={processing === request.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 px-3 py-1 rounded-lg hover:bg-red-50 transition-all duration-200 cursor-pointer font-semibold flex items-center"
                        >
                          <span className="mr-1">❌</span>
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && selectedRequest && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-black/20 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative p-8 border border-gray-200 w-full max-w-lg shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl"></div>
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="mr-3">
                    {action === "approve" ? "✅" : "❌"}
                  </span>
                  {action === "approve" ? "Approve" : "Deny"} Admin Request
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>

              <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md mr-3">
                    <span className="text-lg font-semibold text-white">
                      {selectedRequest.users.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 flex items-center">
                      <span className="mr-2">👤</span>
                      {selectedRequest.users.name}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <span className="mr-2">✉️</span>
                      {selectedRequest.users.email}
                    </p>
                  </div>
                </div>
                {selectedRequest.message && (
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                      <span className="mr-2">💬</span>
                      Message:
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedRequest.message}
                    </p>
                  </div>
                )}
              </div>

              {action === "deny" && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">📝</span>
                    Reason for denial (optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white resize-none"
                    placeholder="Provide a reason for denying this request..."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:shadow-md"
                  disabled={processing === selectedRequest.id}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105 flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === "approve"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  }`}
                  disabled={processing === selectedRequest.id}
                >
                  {processing === selectedRequest.id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  )}
                  {processing === selectedRequest.id
                    ? "Processing..."
                    : action === "approve"
                    ? "✅ Approve Request"
                    : "❌ Deny Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
