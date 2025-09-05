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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              to="/master-dashboard" 
              className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Back to Master Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="text-4xl mr-3">🏢</span>
              Organizations Management
            </h1>
            <p className="mt-2 text-gray-600">
              View and manage all organizations in the system
            </p>
          </div>
        </div>
      </div>

      {/* Organizations List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {organizations.length > 0 ? (
            organizations.map((org) => (
              <li key={org.id} className="px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {org.name}
                      </h3>
                      <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {org.domain}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 space-x-6">
                      <div className="flex items-center">
                        <span className="mr-1">👑</span>
                        {org.admin_count} {org.admin_count === 1 ? 'Admin' : 'Admins'}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">👥</span>
                        {org.user_count} {org.user_count === 1 ? 'User' : 'Users'}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">📅</span>
                        Created {new Date(org.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Link
                      to={`/master-dashboard/organizations/${org.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDeleteOrganization(org)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 sm:px-6 text-center">
              <div className="text-gray-500">
                <span className="text-4xl block mb-4">🏢</span>
                <p className="text-lg">No organizations found</p>
                <p className="text-sm">Organizations will appear here when users sign up</p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOrg && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <span className="text-3xl mr-3">⚠️</span>
                <h3 className="text-lg font-medium text-gray-900">
                  Delete Organization
                </h3>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete <strong>{selectedOrg.name}</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-red-600 mt-1 ml-4">
                  <li>• The organization ({selectedOrg.domain})</li>
                  <li>• All {selectedOrg.user_count} users</li>
                  <li>• All leave requests and data</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedOrg(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Organization'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}