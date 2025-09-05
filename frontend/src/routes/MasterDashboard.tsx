import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface DashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  pendingRequests: number;
  activeOrganizations: number;
}

interface RecentActivity {
  id: string;
  type: 'org_created' | 'admin_request' | 'user_created';
  message: string;
  timestamp: string;
  organization?: string;
}

export function MasterDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    totalUsers: 0,
    pendingRequests: 0,
    activeOrganizations: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        api.get('/master/stats'),
        api.get('/master/activity')
      ]);
      
      setStats(statsResponse.data);
      setRecentActivity(activityResponse.data.activities || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <span className="text-4xl mr-3">🌟</span>
          Master Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Manage all organizations and users across the leave management platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🏢</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Organizations
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalOrganizations}
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
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalUsers}
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
                <span className="text-2xl">📬</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
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
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Organizations
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeOrganizations}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/master-dashboard/organizations"
          className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg border border-blue-200 transition-colors"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">🏢</span>
            <div>
              <h3 className="text-lg font-medium text-blue-900">Organizations</h3>
              <p className="text-blue-700">Manage all organizations</p>
            </div>
          </div>
        </Link>

        <Link
          to="/master-dashboard/users"
          className="bg-green-50 hover:bg-green-100 p-6 rounded-lg border border-green-200 transition-colors"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">👥</span>
            <div>
              <h3 className="text-lg font-medium text-green-900">Users</h3>
              <p className="text-green-700">Search and manage users</p>
            </div>
          </div>
        </Link>

        <Link
          to="/master-dashboard/requests"
          className="bg-orange-50 hover:bg-orange-100 p-6 rounded-lg border border-orange-200 transition-colors"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">📬</span>
            <div>
              <h3 className="text-lg font-medium text-orange-900">Requests</h3>
              <p className="text-orange-700">Admin access requests</p>
            </div>
          </div>
        </Link>

        <Link
          to="/master-dashboard/settings"
          className="bg-purple-50 hover:bg-purple-100 p-6 rounded-lg border border-purple-200 transition-colors"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">⚙️</span>
            <div>
              <h3 className="text-lg font-medium text-purple-900">Settings</h3>
              <p className="text-purple-700">System configuration</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Activity
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest activities across all organizations
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <li key={activity.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">
                      {activity.type === 'org_created' && '🏢'}
                      {activity.type === 'admin_request' && '📬'}
                      {activity.type === 'user_created' && '👤'}
                    </span>
                    <div>
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      {activity.organization && (
                        <p className="text-xs text-gray-500">
                          Organization: {activity.organization}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 sm:px-6 text-center">
              <p className="text-gray-500">No recent activity</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}