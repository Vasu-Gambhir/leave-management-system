import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Organization {
  id: string;
  name: string;
  domain: string;
  admin_count: number;
  user_count: number;
  created_at: string;
  settings: any;
}

export function MasterOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await api.get('/master/organizations');
      setOrganizations(response.data.organizations || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (org: Organization) => {
    setSelectedOrg(org);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrg) return;
    
    setDeleting(true);
    try {
      await api.delete(`/master/organizations/${selectedOrg.id}`);
      setOrganizations(orgs => orgs.filter(org => org.id !== selectedOrg.id));
      setShowDeleteModal(false);
      setSelectedOrg(null);
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organization');
    } finally {
      setDeleting(false);
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
          <span className="text-5xl mr-4">🏢</span>
          Organizations Management
        </h1>
        <p className="mt-3 text-xl text-indigo-100 font-medium leading-relaxed">
          View and manage all organizations in the system
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
          <span className="animate-pulse mr-2">🎨</span>
          System-wide organization control
        </div>
      </div>

      {/* Organizations List */}
      <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
        <ul className="divide-y divide-gray-100">
          {organizations.length > 0 ? (
            organizations.map((org) => (
              <li key={org.id} className="px-8 py-8 hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md mr-4">
                        <span className="text-white text-xl">🏢</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {org.name}
                        </h3>
                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-indigo-100 text-indigo-800 rounded-full shadow-sm">
                          <span className="mr-1">🌐</span>
                          {org.domain}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-100">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">👑</span>
                          <div>
                            <div className="text-lg font-bold text-yellow-800">{org.admin_count}</div>
                            <div className="text-sm font-medium text-yellow-600">{org.admin_count === 1 ? 'Admin' : 'Admins'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">👥</span>
                          <div>
                            <div className="text-lg font-bold text-green-800">{org.user_count}</div>
                            <div className="text-sm font-medium text-green-600">{org.user_count === 1 ? 'User' : 'Users'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">📅</span>
                          <div>
                            <div className="text-lg font-bold text-blue-800">{new Date(org.created_at).toLocaleDateString()}</div>
                            <div className="text-sm font-medium text-blue-600">Created</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-3 ml-8">
                    <Link
                      to={`/master-dashboard/organizations/${org.id}`}
                      className="inline-flex items-center px-6 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md border border-indigo-200"
                    >
                      <span className="mr-2">🔍</span>
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDeleteOrganization(org)}
                      className="inline-flex items-center px-6 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md border border-red-200"
                    >
                      <span className="mr-2">🗑️</span>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-8 py-16 text-center">
              <div className="text-gray-400 text-8xl mb-6">🏢</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No organizations found</h3>
              <p className="text-gray-600 text-lg font-medium">Organizations will appear here when users sign up</p>
              <p className="text-gray-400 mt-2">This is the central hub for all organization management</p>
            </li>
          )}
        </ul>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOrg && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" onClick={() => { setShowDeleteModal(false); setSelectedOrg(null); }}>
          <div className="relative p-8 border border-gray-200 w-full max-w-lg shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl"></div>
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md mr-4">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Delete Organization
                </h3>
              </div>
              <div className="mb-6">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 mb-4">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md mr-3">
                      <span className="text-white text-sm">🏢</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{selectedOrg.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    Domain: <span className="font-medium">{selectedOrg.domain}</span>
                  </p>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                  <p className="text-sm font-semibold text-red-800 mb-3 flex items-center">
                    <span className="mr-2">🚨</span>
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li className="flex items-center">
                      <span className="mr-2">•</span>
                      The organization <span className="font-semibold">({selectedOrg.domain})</span>
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">•</span>
                      All <span className="font-semibold">{selectedOrg.user_count}</span> users
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">•</span>
                      All leave requests and data
                    </li>
                    <li className="flex items-center font-semibold">
                      <span className="mr-2">•</span>
                      This action cannot be undone
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedOrg(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:shadow-md"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
                  disabled={deleting}
                >
                  {deleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  )}
                  {deleting ? 'Deleting Organization...' : '🗑️ Delete Organization'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}