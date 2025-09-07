import { useState, useEffect } from "react";
import { useAuth, ProtectedRoute } from "../lib/auth";
import { leavesAPI } from "../lib/api";

interface LeaveRequest {
  id: string;
  user: {
    name: string;
    email: string;
  };
  leave_type: {
    name: string;
    color: string;
  };
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function ApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const { canApprove } = useAuth();

  useEffect(() => {
    fetchPendingRequests();
  }, [currentPage]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await leavesAPI.getLeaveRequests({
        status: "pending",
        page: currentPage,
        limit: pagination.limit,
      });
      setRequests(response.data.requests || []);
      setPagination((prev) => ({
        ...prev,
        ...response.data.pagination,
        page: currentPage,
      }));
    } catch (err: any) {
      setError("Failed to fetch leave requests");
      console.error("Error fetching leave requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await leavesAPI.updateLeaveStatus(requestId, { status: "approved" });
      await fetchPendingRequests();
    } catch (err) {
      setError("Failed to approve request");
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      await leavesAPI.updateLeaveStatus(requestId, {
        status: "rejected",
        rejection_reason: reason,
      });
      await fetchPendingRequests();
    } catch (err) {
      setError("Failed to reject request");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (!canApprove) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600">
          You don't have permission to approve leave requests.
        </p>
      </div>
    );
  }

  return (
    <ProtectedRoute requireApproval>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 mb-4">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <span className="mr-3">👥</span>
            Leave Approvals
          </h1>
          <p className="mt-2 text-lg text-gray-600 font-medium">
            Review and approve or reject pending leave requests from your team
            members
          </p>
        </div>
        {/* <div className="mb-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl">
          <h1 className="text-4xl font-bold tracking-tight flex items-center">
            <span className="text-5xl mr-4">✅</span>
            Leave Approvals
          </h1>
          <p className="mt-3 text-xl text-indigo-100 font-medium leading-relaxed">
            Review and approve or reject pending leave requests from your team
            members
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
            <span className="animate-pulse mr-2">⚡</span>
            Approval Dashboard
          </div>
        </div> */}

        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-1">
                  Error
                </h3>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Section */}
        {!loading && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📋</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-indigo-600">
                    Pending Requests
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {requests.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">
                    Your Action
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {requests.length === 0 ? "All Clear" : "Review Needed"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
            <div className="p-12 text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-100 border-t-indigo-600 shadow-2xl"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Loading Approvals
              </h3>
              <p className="text-lg text-gray-600 font-medium">
                Fetching pending leave requests...
              </p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
            <div className="text-center py-16">
              <div className="text-gray-400 text-8xl mb-6">✅</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                All Caught Up!
              </h3>
              <p className="text-gray-600 text-lg font-medium mb-2">
                No pending leave requests at this time.
              </p>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 mt-6 max-w-md mx-auto">
                <p className="text-sm text-green-700 font-medium flex items-center justify-center">
                  <span className="mr-2">🎉</span>
                  Your team's leave requests are all up to date!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
            <ul className="divide-y divide-gray-100">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="px-8 py-6 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <h3 className="text-xl font-bold text-gray-900 flex items-center">
                            <span className="mr-3">👤</span>
                            {request.user?.name}
                          </h3>
                          <span
                            className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white shadow-md"
                            style={{
                              backgroundColor:
                                request.leave_type?.color || "#3B82F6",
                            }}
                          >
                            {request.leave_type?.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-lg flex items-center">
                          <span className="mr-1">📅</span>
                          {formatDate(request.created_at)}
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 flex items-center">
                          <span className="mr-2">✉️</span>
                          {request.user?.email}
                        </p>
                      </div>
                      <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                          <span className="mr-2">📅</span>
                          {formatDate(request.start_date)} -{" "}
                          {formatDate(request.end_date)}
                          <span className="ml-3 bg-indigo-200 text-indigo-800 px-2 py-1 rounded-lg text-xs font-bold">
                            {calculateDays(
                              request.start_date,
                              request.end_date
                            )}{" "}
                            days
                          </span>
                        </p>
                      </div>
                      {request.reason && (
                        <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-gray-800 flex items-center mb-1">
                              <span className="mr-2">💭</span>
                              Reason:
                            </span>
                            {request.reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-8 flex flex-col space-y-3">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105 shadow-lg"
                      >
                        <span className="mr-2">✓</span>
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt(
                            "Please provide a reason for rejection:"
                          );
                          if (reason) {
                            handleReject(request.id, reason);
                          }
                        }}
                        className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 cursor-pointer hover:shadow-lg shadow-md"
                      >
                        <span className="mr-2">✗</span>
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-t border-indigo-100 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-6 py-2 border border-indigo-200 text-sm font-semibold rounded-xl text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(
                        Math.min(pagination.pages, currentPage + 1)
                      )
                    }
                    disabled={currentPage === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-6 py-2 border border-indigo-200 text-sm font-semibold rounded-xl text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
                  >
                    Next →
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      Showing{" "}
                      <span className="font-bold text-indigo-600">
                        {(currentPage - 1) * pagination.limit + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-indigo-600">
                        {Math.min(
                          currentPage * pagination.limit,
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
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
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
                          setCurrentPage(
                            Math.min(pagination.pages, currentPage + 1)
                          )
                        }
                        disabled={currentPage === pagination.pages}
                        className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
