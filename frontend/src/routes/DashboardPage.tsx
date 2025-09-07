import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { leavesAPI } from "../lib/api";
import type { LeaveRequest } from "../lib/api";

export function DashboardPage() {
  const { user, isAdmin, canApprove } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  });
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const requestsResponse = await leavesAPI.getLeaveRequests({
        page: 1,
        limit: 5,
        ...(user?.role === "team_member" ? { userId: user.id } : {}),
      });
      setRecentRequests(requestsResponse.data.requests);

      const allRequestsResponse = await leavesAPI.getLeaveRequests({
        limit: 1000,
      });
      const allRequests = allRequestsResponse.data.requests;

      setStats({
        totalRequests: allRequests.length,
        pendingRequests: allRequests.filter(
          (r: LeaveRequest) => r.status === "pending"
        ).length,
        approvedRequests: allRequests.filter(
          (r: LeaveRequest) => r.status === "approved"
        ).length,
        rejectedRequests: allRequests.filter(
          (r: LeaveRequest) => r.status === "rejected"
        ).length,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: LeaveRequest["status"]) => {
    switch (status) {
      case "approved":
        return "text-green-700 bg-green-100";
      case "rejected":
        return "text-red-700 bg-red-100";
      case "pending":
        return "text-yellow-700 bg-yellow-100";
      case "cancelled":
        return "text-gray-700 bg-gray-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="mt-2 text-lg text-indigo-100 font-medium">
          Here's an overview of your leave management dashboard.
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
          <span className="animate-pulse mr-2">🎯</span>
          Stay organized with your leave requests
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Total Requests
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.totalRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              All time
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">⏳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Pending
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.pendingRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-3">
            <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
              Awaiting approval
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Approved
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.approvedRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3">
            <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Successfully approved
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">❌</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Rejected
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.rejectedRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-3">
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              Request declined
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
        <div className="px-6 py-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-3">📋</span>
              Recent Leave Requests
            </h3>
            <a
              href="/approvals"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 cursor-pointer hover:scale-105"
            >
              View all
              <span className="ml-2">→</span>
            </a>
          </div>

          {recentRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📭</div>
              <p className="text-gray-500">No leave requests found</p>
              <p className="text-sm text-gray-400 mt-1">
                {user?.role === "team_member"
                  ? "Your leave requests will appear here"
                  : "Leave requests will appear here"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {recentRequests.map((request) => (
                  <li key={request.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {request.user?.profile_picture ? (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={request.user.profile_picture}
                            alt={request.user.name}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {request.user?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {request.user?.name || "Unknown User"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {request.leave_types?.name} •{" "}
                          {formatDate(request.start_date)} -{" "}
                          {formatDate(request.end_date)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/leaves"
              className="relative group bg-white p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div>
                <span className="text-2xl">🏖️</span>
                <div className="mt-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {user?.role === "team_member"
                      ? "Apply for Leave"
                      : "Manage Leaves"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {user?.role === "team_member"
                      ? "Submit a new leave request"
                      : "View and manage leave requests"}
                  </p>
                </div>
              </div>
            </a>

            {canApprove && (
              <a
                href="/leaves?status=pending"
                className="relative group bg-white p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div>
                  <span className="text-2xl">✅</span>
                  <div className="mt-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      Pending Approvals
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Review and approve leave requests ({stats.pendingRequests}
                      )
                    </p>
                  </div>
                </div>
              </a>
            )}

            {isAdmin && (
              <a
                href="/leave-types"
                className="relative group bg-white p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div>
                  <span className="text-2xl">⚙️</span>
                  <div className="mt-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      Manage Leave Types
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure available leave types
                    </p>
                  </div>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
