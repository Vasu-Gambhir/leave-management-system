import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface DashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  pendingRequests: number;
  activeOrganizations: number;
}

interface RecentActivity {
  id: string;
  type: "org_created" | "admin_request" | "user_created";
  message: string;
  timestamp: string;
  organization?: string;
}

export function MasterDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    totalUsers: 0,
    pendingRequests: 0,
    activeOrganizations: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        api.get("/master/stats"),
        api.get("/master/activity"),
      ]);

      setStats(statsResponse.data);
      setRecentActivity(activityResponse.data.activities || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <div className="mb-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl">
        <h1 className="text-4xl font-bold tracking-tight flex items-center">
          <span className="text-5xl mr-4">🌟</span>
          Master Dashboard
        </h1>
        <p className="mt-3 text-xl text-indigo-100 font-medium leading-relaxed">
          Manage all organizations and users across the leave management platform
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
          <span className="animate-pulse mr-2">🎯</span>
          System-wide control center
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">🏢</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Total Organizations
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.totalOrganizations}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Registered clients
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">👥</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Total Users
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.totalUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3">
            <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Active accounts
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">📬</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Pending Requests
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.pendingRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-3">
            <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Awaiting approval
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-semibold text-gray-600 truncate uppercase tracking-wide">
                    Active Organizations
                  </dt>
                  <dd className="text-2xl font-bold text-gray-800 mt-1">
                    {stats.activeOrganizations}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-3">
            <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
              Currently running
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/master-dashboard/organizations"
          className="bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200 p-8 rounded-2xl border border-blue-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer shadow-lg"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md mr-4">
              <span className="text-white text-2xl">🏢</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-900">
                Organizations
              </h3>
              <p className="text-blue-700 font-medium mt-1">Manage all organizations</p>
            </div>
          </div>
        </Link>

        <Link
          to="/master-dashboard/users"
          className="bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 p-8 rounded-2xl border border-green-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer shadow-lg"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-md mr-4">
              <span className="text-white text-2xl">👥</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-900">Users</h3>
              <p className="text-green-700 font-medium mt-1">Search and manage users</p>
            </div>
          </div>
        </Link>

        <Link
          to="/master-dashboard/requests"
          className="bg-gradient-to-br from-orange-50 to-red-100 hover:from-orange-100 hover:to-red-200 p-8 rounded-2xl border border-orange-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer shadow-lg"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-700 rounded-xl flex items-center justify-center shadow-md mr-4">
              <span className="text-white text-2xl">📬</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-orange-900">Requests</h3>
              <p className="text-orange-700 font-medium mt-1">Admin access requests</p>
            </div>
          </div>
        </Link>

        <Link
          to="/master-dashboard/settings"
          className="bg-gradient-to-br from-purple-50 to-pink-100 hover:from-purple-100 hover:to-pink-200 p-8 rounded-2xl border border-purple-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer shadow-lg"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-700 rounded-xl flex items-center justify-center shadow-md mr-4">
              <span className="text-white text-2xl">⚙️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-900">Settings</h3>
              <p className="text-purple-700 font-medium mt-1">System configuration</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
        <div className="px-8 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <h3 className="text-2xl leading-6 font-bold text-gray-800 flex items-center">
            <span className="mr-3">📈</span>
            Recent Activity
          </h3>
          <p className="mt-2 max-w-2xl text-lg text-gray-600 font-medium">
            Latest activities across all organizations
          </p>
        </div>
        <ul className="divide-y divide-gray-100">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <li key={activity.id} className="px-8 py-6 hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md mr-4
                      ${activity.type === 'org_created' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                        activity.type === 'admin_request' ? 'bg-gradient-to-r from-orange-500 to-red-600' :
                        'bg-gradient-to-r from-green-500 to-emerald-600'}"
                    >
                      <span className="text-white text-xl">
                        {activity.type === "org_created" && "🏢"}
                        {activity.type === "admin_request" && "📬"}
                        {activity.type === "user_created" && "👤"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {activity.message}
                      </p>
                      {activity.organization && (
                        <p className="text-xs text-gray-500 mt-1 bg-gray-100 px-2 py-1 rounded-lg inline-block">
                          Organization: <span className="font-medium">{activity.organization}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-lg">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-8 py-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📈</div>
              <p className="text-xl text-gray-500 font-medium">No recent activity</p>
              <p className="text-gray-400 mt-2">System activities will appear here</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
