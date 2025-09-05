import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { leavesAPI, leaveTypesAPI } from '../lib/api';
import type { LeaveRequest, LeaveType } from '../lib/api';

export function LeavesPage() {
  const { user, canApprove } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newLeaveForm, setNewLeaveForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load leave requests
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (user?.role === 'team_member') {
        params.userId = user.id;
      }

      const [leavesResponse, typesResponse] = await Promise.all([
        leavesAPI.getLeaveRequests(params),
        leaveTypesAPI.getLeaveTypes(),
      ]);

      setLeaves(leavesResponse.data.requests);
      setLeaveTypes(typesResponse.data.leaveTypes.filter((type: LeaveType) => type.is_active));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveForm.leave_type_id || !newLeaveForm.start_date || !newLeaveForm.end_date) {
      return;
    }

    try {
      setSubmitting(true);
      await leavesAPI.createLeaveRequest(newLeaveForm);
      setShowNewLeaveModal(false);
      setNewLeaveForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      alert(error.response?.data?.error || 'Failed to create leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await leavesAPI.updateLeaveStatus(id, { status, rejection_reason: reason });
      loadData();
    } catch (error: any) {
      console.error('Error updating leave status:', error);
      alert(error.response?.data?.error || 'Failed to update leave status');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    
    try {
      await leavesAPI.cancelLeaveRequest(id);
      loadData();
    } catch (error: any) {
      console.error('Error cancelling leave:', error);
      alert(error.response?.data?.error || 'Failed to cancel leave request');
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

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
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
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="mt-1 text-sm text-gray-600">
            {user?.role === 'team_member' 
              ? 'Manage your leave requests'
              : 'Review and manage leave requests'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <button
            onClick={() => setShowNewLeaveModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">+</span>
            New Leave Request
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Leave Requests List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {leaves.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests found</h3>
            <p className="text-gray-500">
              {statusFilter === 'all' 
                ? 'Start by creating your first leave request'
                : `No ${statusFilter} leave requests found`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {leave.users?.profile_picture ? (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={leave.users.profile_picture}
                            alt={leave.users.name}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {leave.users?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {leave.users?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {leave.users?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: leave.leave_types?.color }}
                        ></div>
                        <span className="text-sm text-gray-900">
                          {leave.leave_types?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calculateDays(leave.start_date, leave.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {canApprove && leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveReject(leave.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for rejection (optional):');
                                handleApproveReject(leave.id, 'rejected', reason || undefined);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {leave.user_id === user?.id && ['pending', 'approved'].includes(leave.status) && (
                          <button
                            onClick={() => handleCancel(leave.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Leave Modal */}
      {showNewLeaveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">New Leave Request</h3>
                <button
                  onClick={() => setShowNewLeaveModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleNewLeave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                  <select
                    value={newLeaveForm.leave_type_id}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, leave_type_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={newLeaveForm.start_date}
                      onChange={(e) => setNewLeaveForm({ ...newLeaveForm, start_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={newLeaveForm.end_date}
                      onChange={(e) => setNewLeaveForm({ ...newLeaveForm, end_date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
                  <textarea
                    value={newLeaveForm.reason}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief reason for leave..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewLeaveModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}