import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../lib/auth";
import { leavesAPI, leaveTypesAPI, organizationAPI } from "../lib/api";
import type { LeaveRequest, LeaveType, User } from "../lib/api";

export function LeavesPage() {
  const { user, canApprove } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [organizationSettings, setOrganizationSettings] = useState<any>(null);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [newLeaveForm, setNewLeaveForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    requested_approver_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);

      const params: any = {
        limit: pagination.limit,
        page: pagination.page,
        userId: user?.id,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const [
        leavesResponse,
        typesResponse,
        balancesResponse,
        organizationResponse,
        approversResponse,
      ] = await Promise.all([
        leavesAPI.getLeaveRequests(params),
        leaveTypesAPI.getLeaveTypes(),
        leavesAPI.getLeaveBalance(),
        organizationAPI.getOrganization(),
        organizationAPI.getApprovers(),
      ]);

      setLeaves(leavesResponse.data.requests);
      setPagination(
        leavesResponse.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        }
      );
      const types = typesResponse.data.leaveTypes || [];
      const activeTypes = types.filter((type: LeaveType) => type.is_active);
      setLeaveTypes(activeTypes);
      setLeaveBalances(balancesResponse.data.balances || []);
      setOrganizationSettings(
        organizationResponse.data.organization?.settings || {}
      );
      setApprovers(approversResponse.data.approvers || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newLeaveForm.leave_type_id ||
      !newLeaveForm.start_date ||
      !newLeaveForm.end_date
    ) {
      return;
    }

    try {
      setSubmitting(true);
      await leavesAPI.createLeaveRequest(newLeaveForm);
      setShowNewLeaveModal(false);
      setNewLeaveForm({
        leave_type_id: "",
        start_date: "",
        end_date: "",
        reason: "",
        requested_approver_id: "",
      });
      loadData();
      toast.success("Leave request submitted successfully!");
    } catch (error: any) {
      console.error("Error creating leave request:", error);
      toast.error(
        error.response?.data?.error || "Failed to create leave request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (
    id: string,
    status: "approved" | "rejected",
    reason?: string
  ) => {
    try {
      await leavesAPI.updateLeaveStatus(id, {
        status,
        rejection_reason: reason,
      });
      loadData();
      toast.success(
        `Leave request ${
          status === "approved" ? "approved" : "rejected"
        } successfully!`
      );
    } catch (error: any) {
      console.error("Error updating leave status:", error);
      toast.error(
        error.response?.data?.error || "Failed to update leave status"
      );
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;

    try {
      await leavesAPI.cancelLeaveRequest(id);
      loadData();
      toast.success("Leave request cancelled successfully!");
    } catch (error: any) {
      console.error("Error cancelling leave:", error);
      toast.error(
        error.response?.data?.error || "Failed to cancel leave request"
      );
    }
  };

  const handleSyncToCalendar = async (id: string) => {
    try {
      await leavesAPI.syncToCalendar(id);
      loadData();
      toast.success("Leave request synced to Google Calendar!");
    } catch (error: any) {
      console.error("Error syncing to calendar:", error);
      toast.error(
        error.response?.data?.error || "Failed to sync to Google Calendar"
      );
    }
  };

  const handleUnsyncFromCalendar = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this event from Google Calendar?"
      )
    )
      return;

    try {
      await leavesAPI.unsyncFromCalendar(id);
      loadData();
      toast.success("Leave request unsynced from Google Calendar!");
    } catch (error: any) {
      console.error("Error unsyncing from calendar:", error);
      toast.error(
        error.response?.data?.error || "Failed to unsync from Google Calendar"
      );
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

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const getMaxDateString = () => {
    const today = new Date();
    const maxDate = new Date(today.setMonth(today.getMonth() + 3));
    return maxDate.toISOString().split("T")[0];
  };


  const calculateBusinessDays = (
    startDate: string,
    endDate: string
  ): number => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const current = new Date(start);

    const workingDays = organizationSettings?.workingDays || [1, 2, 3, 4, 5];

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (workingDays.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  const getLeaveBalance = (leaveTypeId: string) => {
    const balance = leaveBalances.find((b) => b.leave_type.id === leaveTypeId);
    return balance || null;
  };

  const isRequestValid = () => {
    if (
      !newLeaveForm.leave_type_id ||
      !newLeaveForm.start_date ||
      !newLeaveForm.end_date ||
      !newLeaveForm.requested_approver_id
    ) {
      return false;
    }

    const requestedDays = calculateBusinessDays(
      newLeaveForm.start_date,
      newLeaveForm.end_date
    );
    const balance = getLeaveBalance(newLeaveForm.leave_type_id);

    if (balance && balance.total_allowed && requestedDays > balance.remaining) {
      return false;
    }

    return true;
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
      <div className="sm:flex sm:items-center sm:justify-between bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <span className="mr-3">📄</span>
            Leave Requests
          </h1>
          <p className="mt-2 text-lg text-gray-600 font-medium">
            {user?.role === "team_member"
              ? "Manage your leave requests"
              : "Review and manage leave requests"}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <button
            onClick={() => setShowNewLeaveModal(true)}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
          >
            <span className="mr-2 text-lg">+</span>
            New Leave Request
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      {leaveBalances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaveBalances.map((balance) => (
            <div
              key={balance.leave_type.id}
              className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-full h-2 rounded-t-2xl"
                style={{ backgroundColor: balance.leave_type.color }}
              ></div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg">
                  {balance.leave_type.name}
                </h3>
                <div
                  className="w-4 h-4 rounded-full shadow-md"
                  style={{ backgroundColor: balance.leave_type.color }}
                ></div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">
                    Total Allowed:
                  </span>
                  <span className="font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">
                    {balance.total_allowed || "∞"} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Used:</span>
                  <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                    {balance.used} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Remaining:</span>
                  <span className="font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                    {balance.total_allowed
                      ? `${balance.remaining} days`
                      : "Unlimited"}
                  </span>
                </div>
              </div>
              {balance.total_allowed && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-3 shadow-inner">
                    <div
                      className="h-3 rounded-full transition-all duration-500 shadow-sm"
                      style={{
                        backgroundColor: balance.leave_type.color,
                        width: `${Math.min(
                          (balance.used / balance.total_allowed) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
        <span className="text-sm font-semibold text-gray-600 flex items-center mr-2">
          🔍 Filter by status:
        </span>
        {["all", "pending", "approved", "rejected", "cancelled"].map(
          (status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                statusFilter === status
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md hover:scale-102"
              }`}
            >
              {status === "all"
                ? "All"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Leave Requests List */}
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        {leaves.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No leave requests found
            </h3>
            <p className="text-gray-500">
              {statusFilter === "all"
                ? "Start by creating your first leave request"
                : `No ${statusFilter} leave requests found`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    👤 Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📋 Leave Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📅 Dates
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ⏰ Working Days
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    🏷️ Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📆 Calendar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ⚙️ Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {leaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        {leave.user?.profile_picture ? (
                          <img
                            className="h-10 w-10 rounded-full ring-2 ring-gray-200 hover:ring-indigo-300 transition-all duration-200"
                            src={leave.user.profile_picture}
                            alt={leave.user.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                            <span className="text-sm font-semibold text-white">
                              {leave.user?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {leave.user?.name || "Unknown User"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {leave.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: leave.leave_types?.color }}
                        ></div>
                        <span className="text-sm text-gray-900">
                          {leave.leave_types?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {formatDate(leave.start_date)} -{" "}
                        {formatDate(leave.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calculateBusinessDays(leave.start_date, leave.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          leave.status
                        )}`}
                      >
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {leave.calendar_event_id ? (
                          <div className="flex items-center space-x-1">
                            <svg
                              className="h-4 w-4 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-xs text-green-600">
                              Synced
                            </span>
                          </div>
                        ) : leave.status === "approved" ? (
                          <div className="flex items-center space-x-1">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-xs text-gray-500">
                              Not synced
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <svg
                              className="h-4 w-4 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-xs text-gray-400">—</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {canApprove && leave.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleApproveReject(leave.id, "approved")
                              }
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt(
                                  "Reason for rejection (optional):"
                                );
                                handleApproveReject(
                                  leave.id,
                                  "rejected",
                                  reason || undefined
                                );
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {leave.user_id === user?.id &&
                          ["pending", "approved"].includes(leave.status) && (
                            <button
                              onClick={() => handleCancel(leave.id)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          )}
                        {/* Calendar sync/unsync buttons */}
                        {leave.status === "approved" &&
                          (canApprove || leave.user_id === user?.id) && (
                            <>
                              {leave.calendar_event_id ? (
                                <button
                                  onClick={() =>
                                    handleUnsyncFromCalendar(leave.id)
                                  }
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Remove from Google Calendar"
                                >
                                  Unsync
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSyncToCalendar(leave.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Add to Google Calendar"
                                >
                                  Sync
                                </button>
                              )}
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-t border-indigo-100 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-indigo-200 text-sm font-semibold rounded-xl text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
              >
                ← Previous
              </button>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(prev.pages, prev.page + 1),
                  }))
                }
                disabled={pagination.page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-indigo-200 text-sm font-semibold rounded-xl text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
              >
                Next →
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">
                  Showing{" "}
                  <span className="font-bold text-indigo-600">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-indigo-600">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-indigo-600">
                    {pagination.total}
                  </span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl shadow-lg -space-x-px bg-white border border-indigo-200">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from(
                    { length: Math.min(pagination.pages, 5) },
                    (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: pageNum,
                            }))
                          }
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pagination.page === pageNum
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.min(prev.pages, prev.page + 1),
                      }))
                    }
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Leave Modal */}
      {showNewLeaveModal && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-black/20 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={() => setShowNewLeaveModal(false)}
        >
          <div
            className="relative p-8 border border-gray-200 w-full max-w-md shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl"></div>
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="mr-3">📝</span>
                  New Leave Request
                </h3>
                <button
                  onClick={() => setShowNewLeaveModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>

              <form onSubmit={handleNewLeave} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📋 Leave Type
                  </label>
                  <select
                    value={newLeaveForm.leave_type_id}
                    onChange={(e) =>
                      setNewLeaveForm({
                        ...newLeaveForm,
                        leave_type_id: e.target.value,
                      })
                    }
                    className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white"
                    required
                    disabled={submitting}
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.length === 0 && (
                      <option disabled>No leave types available</option>
                    )}
                    {leaveTypes.map((type) => {
                      const balance = getLeaveBalance(type.id);
                      return (
                        <option key={type.id} value={type.id}>
                          {type.name}
                          {balance && balance.total_allowed
                            ? ` (${balance.remaining}/${balance.total_allowed} remaining)`
                            : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📅 Start Date
                    </label>
                    <p className="text-xs text-indigo-600 mb-2 font-medium">
                      Today to 3 months ahead
                    </p>
                    <input
                      type="date"
                      value={newLeaveForm.start_date}
                      min={getTodayString()}
                      max={getMaxDateString()}
                      onChange={(e) =>
                        setNewLeaveForm({
                          ...newLeaveForm,
                          start_date: e.target.value,
                        })
                      }
                      className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white cursor-pointer"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📅 End Date
                    </label>
                    <p className="text-xs text-indigo-600 mb-2 font-medium">
                      Same day or after start date
                    </p>
                    <input
                      type="date"
                      value={newLeaveForm.end_date}
                      min={newLeaveForm.start_date || getTodayString()}
                      max={getMaxDateString()}
                      onChange={(e) =>
                        setNewLeaveForm({
                          ...newLeaveForm,
                          end_date: e.target.value,
                        })
                      }
                      className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white cursor-pointer"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Show calculated days and balance info */}
                {newLeaveForm.start_date && newLeaveForm.end_date && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                    <div className="text-sm">
                      <p className="font-semibold text-indigo-800 mb-2 flex items-center">
                        <span className="mr-2">📊</span>
                        Calculated Leave Days (working days only):
                      </p>
                      <p className="text-blue-700">
                        <span className="font-semibold">
                          {calculateBusinessDays(
                            newLeaveForm.start_date,
                            newLeaveForm.end_date
                          )}{" "}
                          working days
                        </span>
                        {newLeaveForm.leave_type_id &&
                          (() => {
                            const balance = getLeaveBalance(
                              newLeaveForm.leave_type_id
                            );
                            const requestedDays = calculateBusinessDays(
                              newLeaveForm.start_date,
                              newLeaveForm.end_date
                            );

                            if (balance && balance.total_allowed) {
                              if (requestedDays > balance.remaining) {
                                return (
                                  <span className="block text-red-600 font-medium mt-1">
                                    ⚠️ Insufficient balance! You only have{" "}
                                    {balance.remaining} days remaining.
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="block text-green-600 mt-1">
                                    ✓ Balance after request:{" "}
                                    {balance.remaining - requestedDays} days
                                    remaining
                                  </span>
                                );
                              }
                            }
                            return null;
                          })()}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    👥 Select Approver
                  </label>
                  <select
                    value={newLeaveForm.requested_approver_id}
                    onChange={(e) =>
                      setNewLeaveForm({
                        ...newLeaveForm,
                        requested_approver_id: e.target.value,
                      })
                    }
                    className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white cursor-pointer"
                    required
                    disabled={submitting}
                  >
                    <option value="">
                      Select who should approve this request
                    </option>
                    {approvers.length === 0 && (
                      <option disabled>No approvers available</option>
                    )}
                    {approvers.map((approver) => (
                      <option key={approver.id} value={approver.id}>
                        {approver.name} ({approver.role.replace("_", " ")})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {user?.role === "team_member" &&
                      "You can request approval from approval managers and admins"}
                    {user?.role === "approval_manager" &&
                      "You can only request approval from admins"}
                    {user?.role === "admin" &&
                      "You can request approval from any admin"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💭 Reason (Optional)
                  </label>
                  <textarea
                    value={newLeaveForm.reason}
                    onChange={(e) =>
                      setNewLeaveForm({
                        ...newLeaveForm,
                        reason: e.target.value,
                      })
                    }
                    rows={3}
                    className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white resize-none"
                    placeholder="Brief reason for your leave request..."
                    disabled={submitting}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowNewLeaveModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:shadow-md"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105 flex items-center"
                    disabled={submitting || !isRequestValid()}
                  >
                    {submitting
                      ? "Submitting..."
                      : !isRequestValid() &&
                        newLeaveForm.leave_type_id &&
                        newLeaveForm.start_date &&
                        newLeaveForm.end_date
                      ? "Insufficient Balance"
                      : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
