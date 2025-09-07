import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export function AdminApprovalPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  const token = searchParams.get('token');
  const action = searchParams.get('action');

  useEffect(() => {
    if (!token || !action) {
      setResult({
        success: false,
        message: 'Invalid approval link. Please check the link in your email.',
      });
      setLoading(false);
      return;
    }

    if (!['approve', 'deny'].includes(action)) {
      setResult({
        success: false,
        message: 'Invalid action. Please use the correct link from your email.',
      });
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [token, action]);

  const processRequest = async (withReason: boolean = false) => {
    if (!token || !action) return;

    setProcessing(true);

    try {
      const response = await api.post('/admin-requests/process', {
        token,
        action,
        reason: withReason ? reason : undefined,
      });

      setResult({
        success: true,
        message: response.data.message || `Request ${action}d successfully!`,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.error || `Failed to ${action} request`,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = () => {
    processRequest();
  };

  const handleDeny = () => {
    if (reason.trim()) {
      processRequest(true);
    } else {
      setShowReasonInput(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-8 text-center border border-gray-100 hover:shadow-3xl transition-all duration-300">
            <div className={`mx-auto h-16 w-16 mb-6 ${result.success ? 'text-green-500' : 'text-red-500'}`}>
              <span className="text-6xl">{result.success ? '✅' : '❌'}</span>
            </div>
            <h1 className={`text-2xl font-bold mb-4 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
              {result.success ? 'Success!' : 'Error'}
            </h1>
            <p className="text-gray-700 mb-8 text-lg leading-relaxed">{result.message}</p>
            {result.success && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                <p className="text-sm text-indigo-700 font-medium flex items-center justify-center">
                  <span className="mr-2">📧</span>
                  The user has been notified via email about your decision.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-8 border border-gray-100 hover:shadow-3xl transition-all duration-300">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 text-blue-500 mb-6">
              <span className="text-6xl">👑</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">Admin Request Review</h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Please review this admin access request.
            </p>
          </div>

          {showReasonInput && action === 'deny' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for denial (optional):
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 font-medium bg-gray-50 hover:bg-white resize-none"
                  placeholder="Explain why this request is being denied..."
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleDeny}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 font-semibold transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105"
                >
                  {processing ? 'Processing...' : 'Confirm Denial'}
                </button>
                <button
                  onClick={() => setShowReasonInput(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 font-semibold transition-all duration-200 cursor-pointer hover:shadow-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">⚠️</span>
                  <p className="text-sm text-blue-800 leading-relaxed font-medium">
                    Someone has requested admin access. Approving this request will grant them 
                    full administrative privileges including the ability to approve leaves, 
                    manage users, and configure organization settings.
                  </p>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105"
                >
                  {processing ? 'Processing...' : '✓ Approve Request'}
                </button>
                <button
                  onClick={handleDeny}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 font-semibold transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105"
                >
                  {processing ? 'Processing...' : '✗ Deny Request'}
                </button>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-600 text-center font-medium flex items-center justify-center">
                  <span className="mr-2">📧</span>
                  The user will be notified via email about your decision.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}