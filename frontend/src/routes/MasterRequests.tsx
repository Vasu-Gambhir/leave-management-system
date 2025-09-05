import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface AdminRequest {
  id: string;
  requested_at: string;
  expires_at: string;
  status: string;
  approval_token: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
  organizations: {
    id: string;
    name: string;
    domain: string;
  };
}

export function MasterRequests() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await api.get('/master/admin-requests');
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error loading admin requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, token: string, action: 'approve' | 'deny') => {
    setProcessing(requestId);
    try {
      await api.post('/admin-requests/process', {
        token,
        action
      });
      
      // Remove the processed request from the list
      setRequests(requests => requests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request');
    } finally {
      setProcessing(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
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
          <span className="text-4xl mr-3">📬</span>
          Admin Requests Management
        </h1>
        <p className="mt-2 text-gray-600">
          Review and process admin access requests from organizations
        </p>
      </div>

      {/* Requests List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {requests.length > 0 ? (
            requests.map((request) => (
              <li key={request.id} className="px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {request.users.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {request.users.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                          PENDING
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Organization</p>
                        <p className="text-sm text-gray-900">{request.organizations.name}</p>
                        <p className="text-xs text-gray-500">{request.organizations.domain}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Requested</p>
                        <p className="text-sm text-gray-900">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(request.requested_at).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Expires</p>
                        <p className="text-sm text-gray-900">
                          {formatTimeRemaining(request.expires_at)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(request.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>First Admin Request:</strong> This organization currently has no admins. 
                        Approving this request will make {request.users.name} the first admin for {request.organizations.name}.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-end space-x-3">
                  <button
                    onClick={() => handleRequest(request.id, request.approval_token, 'deny')}
                    disabled={processing === request.id}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {processing === request.id ? 'Processing...' : '✗ Deny Request'}
                  </button>
                  <button
                    onClick={() => handleRequest(request.id, request.approval_token, 'approve')}
                    disabled={processing === request.id}
                    className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {processing === request.id ? 'Processing...' : '✓ Approve Request'}
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-12 sm:px-6 text-center">
              <div className="text-gray-500">
                <span className="text-6xl block mb-4">📬</span>
                <h3 className="text-xl font-medium mb-2">No Pending Requests</h3>
                <p className="text-sm">
                  Admin access requests from organizations will appear here.
                </p>
                <p className="text-xs mt-2">
                  Only first admin requests (from organizations with no existing admins) are sent to the master user.
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {requests.length > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">💡</span>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Important Notes:</h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• These are first admin requests from organizations with no existing admins</li>
                <li>• Once approved, future requests will go to the organization's admins</li>
                <li>• Requests expire after 24 hours and users can submit new requests</li>
                <li>• Users can only submit one request per 24 hours</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}