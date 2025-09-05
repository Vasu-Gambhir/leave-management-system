import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { leavesAPI, authAPI } from '../lib/api';
import type { LeaveRequest } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { user, isAdmin, canApprove, login } = useAuth();
  const navigate = useNavigate();
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

      // Load recent leave requests
      const requestsResponse = await leavesAPI.getLeaveRequests({
        page: 1,
        limit: 5,
        ...(user?.role === 'team_member' ? { userId: user.id } : {}),
      });
      setRecentRequests(requestsResponse.data.requests);

      // Calculate stats
      const allRequestsResponse = await leavesAPI.getLeaveRequests({ limit: 1000 });
      const allRequests = allRequestsResponse.data.requests;
      
      setStats({
        totalRequests: allRequests.length,
        pendingRequests: allRequests.filter((r: LeaveRequest) => r.status === 'pending').length,
        approvedRequests: allRequests.filter((r: LeaveRequest) => r.status === 'approved').length,
        rejectedRequests: allRequests.filter((r: LeaveRequest) => r.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'text-green-700 bg-green-100';
      case 'rejected':
        return 'text-red-700 bg-red-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'cancelled':
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's an overview of your leave management dashboard.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <span className="text-yellow-600 font-semibold">⏳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-600 font-semibold">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Approved
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.approvedRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <span className="text-red-600 font-semibold">❌</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Rejected
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.rejectedRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Leave Requests
            </h3>
            <a
              href="/leaves"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </a>
          </div>
          
          {recentRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📭</div>
              <p className="text-gray-500">No leave requests found</p>
              <p className="text-sm text-gray-400 mt-1">
                {user?.role === 'team_member' 
                  ? 'Your leave requests will appear here'
                  : 'Leave requests will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {recentRequests.map((request) => (
                  <li key={request.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {request.users?.profile_picture ? (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={request.users.profile_picture}
                            alt={request.users.name}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {request.users?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {request.users?.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {request.leave_types?.name} • {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
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
                    {user?.role === 'team_member' ? 'Apply for Leave' : 'Manage Leaves'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {user?.role === 'team_member' 
                      ? 'Submit a new leave request'
                      : 'View and manage leave requests'
                    }
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
                      Review and approve leave requests ({stats.pendingRequests})
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