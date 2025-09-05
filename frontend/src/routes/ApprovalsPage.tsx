import { useState, useEffect } from 'react';
import { useAuth, ProtectedRoute } from '../lib/auth';
import { leavesAPI } from '../lib/api';

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
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function ApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { canApprove } = useAuth();

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await leavesAPI.getLeaveRequests({
        status: 'pending',
        page: 1,
        limit: 50
      });
      setRequests(response.data.requests || []);
    } catch (err: any) {
      setError('Failed to fetch leave requests');
      console.error('Error fetching leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await leavesAPI.updateLeaveStatus(requestId, { status: 'approved' });
      await fetchPendingRequests(); // Refresh the list
    } catch (err) {
      setError('Failed to approve request');
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      await leavesAPI.updateLeaveStatus(requestId, { status: 'rejected', rejection_reason: reason });
      await fetchPendingRequests(); // Refresh the list
    } catch (err) {
      setError('Failed to reject request');
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to approve leave requests.</p>
      </div>
    );
  }

  return (
    <ProtectedRoute requireApproval>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
            <p className="mt-2 text-sm text-gray-700">
              Review and approve or reject pending leave requests.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <span className="text-4xl">✅</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
            <p className="mt-1 text-sm text-gray-500">All leave requests have been processed.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.user?.name}
                          </h3>
                          <span 
                            className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: request.leave_type?.color || '#3B82F6' }}
                          >
                            {request.leave_type?.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(request.created_at)}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">{request.user?.email}</p>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                          <span className="ml-2 text-gray-600">
                            ({calculateDays(request.start_date, request.end_date)} days)
                          </span>
                        </p>
                      </div>
                      {request.reason && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">
                            <strong>Reason:</strong> {request.reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-6 flex space-x-3">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Please provide a reason for rejection:');
                          if (reason) {
                            handleReject(request.id, reason);
                          }
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}