import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  profile_picture?: string;
  created_at: string;
  organizations: {
    id: string;
    name: string;
    domain: string;
  };
}

interface Organization {
  id: string;
  name: string;
  domain: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function MasterUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
    loadOrganizations();
  }, [pagination.page, searchQuery, selectedOrgId]);

  const loadOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      const response = await api.get("/master/organizations");
      setOrganizations(response.data.organizations || []);
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get("/master/users", {
        params: {
          search: searchQuery,
          page: pagination.page,
          limit: pagination.limit,
          organizationId: selectedOrgId || undefined,
        },
      });

      setUsers(response.data.users || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadUsers();
  };

  const handleOrganizationFilter = (orgId: string) => {
    setSelectedOrgId(orgId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRoleChange = async (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser || newRole === selectedUser.role) {
      setShowRoleModal(false);
      return;
    }

    setUpdating(true);
    try {
      await api.patch(`/master/users/${selectedUser.id}/role`, {
        role: newRole,
      });

      setUsers((users) =>
        users.map((user) =>
          user.id === selectedUser.id ? { ...user, role: newRole } : user
        )
      );

      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role");
    } finally {
      setUpdating(false);
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
          <span className="text-5xl mr-4">👥</span>
          Users Management
        </h1>
        <p className="mt-3 text-xl text-indigo-100 font-medium leading-relaxed">
          Search and manage users across all organizations
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
          <span className="animate-pulse mr-2">🔍</span>
          Global user management system
        </div>
      </div>

      {/* Search */}
      <div className="mb-8 bg-white shadow-xl rounded-2xl p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-3">🔍</span>
          Search Users
        </h2>
        <div className="space-y-4">
          {/* Organization Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <span className="mr-2">🏢</span>
              Filter by Organization
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => handleOrganizationFilter(e.target.value)}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 font-medium bg-gray-50 hover:bg-white cursor-pointer"
              disabled={loadingOrgs}
            >
              <option value="">
                All Organizations ({organizations.length})
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 font-medium bg-gray-50 hover:bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 cursor-pointer hover:shadow-lg font-semibold flex items-center"
            >
              <span className="mr-2">🔍</span>
              Search
            </button>
            {(searchQuery || selectedOrgId) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedOrgId("");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200 cursor-pointer font-semibold flex items-center"
              >
                <span className="mr-2">✖</span>
                Clear All
              </button>
            )}
          </form>
        </div>
        {(searchQuery || selectedOrgId) && (
          <div className="mt-4 space-y-2">
            {searchQuery && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-100">
                <p className="text-sm text-indigo-700 font-medium flex items-center">
                  <span className="mr-2">🔍</span>
                  Search: "{searchQuery}"
                </p>
              </div>
            )}
            {selectedOrgId && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-700 font-medium flex items-center">
                  <span className="mr-2">🏢</span>
                  Organization:{" "}
                  {organizations.find((org) => org.id === selectedOrgId)
                    ?.name || "Unknown"}
                </p>
              </div>
            )}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100">
              <p className="text-sm text-green-700 font-medium flex items-center">
                <span className="mr-2">📊</span>
                {pagination.total} users found
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100 mb-8">
        <ul className="divide-y divide-gray-100">
          {users.length > 0 ? (
            users.map((user) => (
              <li
                key={user.id}
                className="px-8 py-6 hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {user.profile_picture ? (
                      <img
                        className="h-14 w-14 rounded-full ring-2 ring-gray-200 hover:ring-indigo-300 transition-all duration-200 shadow-md"
                        src={user.profile_picture}
                        alt={user.name}
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                        <span className="text-xl font-semibold text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="mr-2">👤</span>
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <span className="mr-2">✉️</span>
                        {user.email}
                      </p>
                      <div className="mt-3 flex items-center flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full shadow-md ${
                            user.email === import.meta.env.VITE_MASTER_EMAIL
                              ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                              : user.role === "admin"
                              ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                              : user.role === "approval_manager"
                              ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white"
                              : "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                          }`}
                        >
                          {user.email === import.meta.env.VITE_MASTER_EMAIL
                            ? "🌟 MASTER"
                            : user.role === "admin"
                            ? "👑 ADMIN"
                            : user.role === "approval_manager"
                            ? "👔 MANAGER"
                            : "👤 MEMBER"}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                          <span className="mr-1">🏢</span>
                          {user.organizations.name}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
                          <span className="mr-1">🌐</span>
                          {user.organizations.domain}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full">
                          <span className="mr-1">📅</span>
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {user.email !== import.meta.env.VITE_MASTER_EMAIL && (
                    <button
                      onClick={() => handleRoleChange(user)}
                      className="inline-flex items-center px-6 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md border border-indigo-200"
                    >
                      <span className="mr-2">⚙️</span>
                      Change Role
                    </button>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="px-8 py-16 text-center">
              <div className="text-gray-400 text-8xl mb-6">👥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {searchQuery || selectedOrgId
                  ? "No users found for your filters"
                  : "No users found"}
              </h3>
              <p className="text-gray-600 text-lg font-medium">
                {searchQuery || selectedOrgId
                  ? "Try adjusting your search terms or organization filter"
                  : "Users will appear here when they join organizations"}
              </p>
              {(searchQuery || selectedOrgId) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedOrgId("");
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="mt-4 inline-flex items-center px-6 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 cursor-pointer border border-indigo-200"
                >
                  <span className="mr-2">✖</span>
                  Clear All Filters
                </button>
              )}
            </li>
          )}
        </ul>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 rounded-2xl border border-indigo-100 shadow-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-6 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
            >
              ← Previous
            </button>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page >= pagination.pages}
              className="relative ml-3 inline-flex items-center px-6 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
            >
              Next →
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
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
            <div className="flex space-x-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`px-3 py-2 text-sm font-semibold rounded-xl cursor-pointer transition-all duration-200 ${
                      page === pagination.page
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-white shadow-sm border border-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-black/20 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
        >
          <div
            className="relative p-8 border border-gray-200 w-full max-w-lg shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl"></div>
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md mr-4">
                  <span className="text-white text-2xl">⚙️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Change User Role
                </h3>
              </div>
              <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md mr-3">
                    <span className="text-white font-semibold">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 flex items-center">
                      <span className="mr-2">👤</span>
                      {selectedUser.name}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <span className="mr-2">✉️</span>
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">🏢</span>
                      Organization:{" "}
                      <span className="ml-1 text-indigo-600">
                        {selectedUser.organizations.name}
                      </span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">🏷️</span>
                      Current Role:{" "}
                      <span className="ml-1 text-purple-600">
                        {selectedUser.role.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">🔄</span>
                  Select New Role:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 font-medium bg-gray-50 hover:bg-white cursor-pointer"
                >
                  <option value="team_member">👤 Team Member</option>
                  <option value="approval_manager">👔 Approval Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:shadow-md"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleChange}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
                  disabled={updating || newRole === selectedUser.role}
                >
                  {updating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  )}
                  {updating ? "Updating Role..." : "✅ Update Role"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
