import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  profile_picture?: string;
  created_at: string;
  organizations: {
    name: string;
    domain: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function MasterUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [pagination.page, searchQuery]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/master/users', {
        params: {
          search: searchQuery,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      
      setUsers(response.data.users || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers();
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
        role: newRole
      });
      
      // Update user in the list
      setUsers(users => 
        users.map(user => 
          user.id === selectedUser.id 
            ? { ...user, role: newRole }
            : user
        )
      );
      
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'approval_manager': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <Link 
          to="/master-dashboard" 
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Master Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <span className="text-4xl mr-3">👥</span>
          Users Management
        </h1>
        <p className="mt-2 text-gray-600">
          Search and manage users across all organizations
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
        <ul className="divide-y divide-gray-200">
          {users.length > 0 ? (
            users.map((user) => (
              <li key={user.id} className="px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {user.profile_picture ? (
                      <img
                        className="h-12 w-12 rounded-full"
                        src={user.profile_picture}
                        alt={user.name}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-lg font-medium text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="mt-1 flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.email === import.meta.env.VITE_MASTER_EMAIL 
                            ? 'bg-purple-100 text-purple-800' 
                            : getRoleColor(user.role)
                        }`}>
                          {user.email === import.meta.env.VITE_MASTER_EMAIL 
                            ? '🌟 MASTER' 
                            : user.role.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user.organizations.name} ({user.organizations.domain})
                        </span>
                        <span className="text-xs text-gray-500">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {user.email !== import.meta.env.VITE_MASTER_EMAIL && (
                    <button
                      onClick={() => handleRoleChange(user)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Change Role
                    </button>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 sm:px-6 text-center">
              <div className="text-gray-500">
                <span className="text-4xl block mb-4">👥</span>
                <p className="text-lg">
                  {searchQuery ? 'No users found for your search' : 'No users found'}
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.pages}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div className="flex space-x-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setPagination(prev => ({ ...prev, page }))}
                  className={`px-3 py-2 text-sm rounded-md ${
                    page === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Change User Role
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>User:</strong> {selectedUser.name} ({selectedUser.email})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Organization:</strong> {selectedUser.organizations.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Current Role:</strong> {selectedUser.role.replace('_', ' ')}
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="team_member">Team Member</option>
                  <option value="approval_manager">Approval Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoleChange}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={updating || newRole === selectedUser.role}
                >
                  {updating ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}