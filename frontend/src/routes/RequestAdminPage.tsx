import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

interface AdminRequestStatus {
  hasPendingRequest: boolean;
  pendingRequest: any;
  organizationHasAdmin: boolean;
}

interface Admin {
  id: string;
  name: string;
  email: string;
}

export function RequestAdminPage() {
  const [status, setStatus] = useState<AdminRequestStatus | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchRequestStatus();
    fetchOrgAdmins();
  }, []);

  const fetchRequestStatus = async () => {
    try {
      const response = await api.get("/admin-requests/status");
      setStatus(response.data);
    } catch (err: any) {
      console.error("Error fetching request status:", err);
      setError(
        "Failed to load request status: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  const fetchOrgAdmins = async () => {
    try {
      const response = await api.get("/admin-requests/org-admins");
      setAdmins(response.data.admins || []);

      if (response.data.admins && response.data.admins.length === 1) {
        setSelectedAdmin(response.data.admins[0].email);
      }
    } catch (err: any) {
      console.error("Error fetching admins:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!status) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/admin-requests", {
        targetAdminEmail: status.organizationHasAdmin
          ? selectedAdmin
          : undefined,
        message: message.trim() || undefined,
      });

      setSuccess(
        response.data.message || "Admin request submitted successfully!"
      );

      await fetchRequestStatus();
    } catch (err: any) {
      console.error("Error submitting admin request:", err);
      setError(
        err.response?.data?.error || err.message || "Failed to submit request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user?.role === "admin") {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-green-500 mb-4">
          <span className="text-4xl">👑</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          You're Already an Admin!
        </h3>
        <p className="text-gray-600">
          You have full administrative privileges for your organization.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 text-blue-500 mb-4">
            <span className="text-4xl">👑</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Request Admin Access
          </h1>
          <p className="text-gray-600">
            Request administrative privileges for your organization's leave
            management system.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4 mb-6">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {status?.hasPendingRequest ? (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-yellow-500 mb-4">
              <span className="text-4xl">⏳</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Request Pending
            </h3>
            <p className="text-gray-600 mb-4">
              You have a pending admin request. Please wait for approval.
            </p>

            {status.pendingRequest && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <div className="space-y-2">
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {new Date(
                      status.pendingRequest.requested_at
                    ).toLocaleString()}
                  </p>
                  <p>
                    <strong>Expires:</strong>{" "}
                    {new Date(
                      status.pendingRequest.expires_at
                    ).toLocaleString()}
                  </p>
                  {status.pendingRequest.target_admin_email && (
                    <p>
                      <strong>Sent to:</strong>{" "}
                      {status.pendingRequest.target_admin_email}
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 mt-4">
              You can submit a new request in 24 hours if this one expires.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                What Admin Access Includes:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Approve or deny leave requests</li>
                <li>• Manage leave types and policies</li>
                <li>• View organization analytics and reports</li>
                <li>• Manage user roles and permissions</li>
                <li>• Configure organization settings</li>
              </ul>
            </div>

            {status?.organizationHasAdmin ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Admin to Review Your Request
                  </label>
                  <select
                    value={selectedAdmin}
                    onChange={(e) => setSelectedAdmin(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose an admin...</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.email}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">
                  No Existing Admins
                </h3>
                <p className="text-sm text-yellow-700">
                  Your organization doesn't have any admins yet. Your request
                  will be sent to the master administrator for approval.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Message{" "}
                {status?.organizationHasAdmin ? "(Optional)" : "(Optional)"}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  status?.organizationHasAdmin
                    ? "Tell the admin why you need admin access..."
                    : "Tell the master admin why you need admin access for your organization..."
                }
                rows={4}
                maxLength={500}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500">
                {message.length}/500 characters
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Request Process:
              </h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Your request will be sent via email for approval</li>
                <li>2. The approver can approve or deny your request</li>
                <li>
                  3. You'll receive an email notification with the decision
                </li>
                <li>4. If approved, you'll get admin access immediately</li>
              </ol>
            </div>

            <button
              onClick={submitRequest}
              disabled={
                submitting || (status?.organizationHasAdmin && !selectedAdmin)
              }
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting Request...
                </>
              ) : (
                "Submit Admin Request"
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              You can only submit one request every 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
