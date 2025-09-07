import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../lib/auth';
import { organizationAPI, type User } from '../lib/api';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await organizationAPI.getUsers({ 
        limit: pagination.limit,
        page: currentPage 
      });
      setUsers(response.data.users);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
        page: currentPage
      }));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: User['role']) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      await organizationAPI.updateUserRole(userId, newRole);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await organizationAPI.deleteUser(userId);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <span className="mr-3">👥</span>
            Users
          </h1>
          <p className="mt-2 text-lg text-gray-600 font-medium">
            Manage users and their roles in your organization
          </p>
        </div>

        <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 shadow-lg mx-auto"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
              </div>
              <p className="mt-4 text-lg text-gray-600 font-medium">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <p className="text-xl text-gray-500 font-medium">No users found.</p>
              <p className="text-gray-400 mt-2">Users will appear here when they join your organization.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {users.map((user) => (
                <li key={user.id}>
                  <div className="px-8 py-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200">
                    <div className="flex items-center">
                      {user.profile_picture ? (
                        <img
                          className="h-12 w-12 rounded-full ring-2 ring-gray-200 hover:ring-indigo-300 transition-all duration-200 shadow-md"
                          src={user.profile_picture}
                          alt={user.name}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                          <span className="text-lg font-semibold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="ml-6">
                        <div className="text-lg font-bold text-gray-900 flex items-center">
                          <span className="mr-2">👤</span>
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <span className="mr-2">✉️</span>
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-end space-y-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])}
                          className="block text-sm border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 hover:bg-white transition-all duration-200 cursor-pointer font-medium shadow-sm"
                        >
                          <option value="team_member">👤 Team Member</option>
                          <option value="approval_manager">👔 Approval Manager</option>
                          <option value="admin">👑 Admin</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-semibold px-3 py-1 rounded-lg hover:bg-red-50 transition-all duration-200 cursor-pointer flex items-center"
                        >
                          <span className="mr-1">🗑️</span>
                          Delete
                        </button>
                      </div>
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
                    onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                    disabled={currentPage === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-6 py-2 border border-indigo-200 text-sm font-semibold rounded-xl text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md"
                  >
                    Next →
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      Showing <span className="font-bold text-indigo-600">{((currentPage - 1) * pagination.limit) + 1}</span> to{' '}
                      <span className="font-bold text-indigo-600">
                        {Math.min(currentPage * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-bold text-indigo-600">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-xl shadow-lg -space-x-px bg-white border border-indigo-200">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-semibold cursor-pointer ${
                              currentPage === pageNum
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}