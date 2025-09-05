import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

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
      const response = await fetch('/api/admin-requests/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          action,
          reason: withReason ? reason : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || `Request ${action}d successfully!`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || `Failed to ${action} request`,
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Error processing request: ${err.message}`,
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <div className={`mx-auto h-12 w-12 mb-4 ${result.success ? 'text-green-500' : 'text-red-500'}`}>
              <span className="text-4xl">{result.success ? '✅' : '❌'}</span>
            </div>
            <h1 className={`text-xl font-bold mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
              {result.success ? 'Success!' : 'Error'}
            </h1>
            <p className="text-gray-600 mb-6">{result.message}</p>
            {result.success && (
              <p className="text-sm text-gray-500">
                The user has been notified via email about your decision.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 text-blue-500 mb-4">
              <span className="text-4xl">👑</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Request Review</h1>
            <p className="text-gray-600">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Explain why this request is being denied..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeny}
                  disabled={processing}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Denial'}
                </button>
                <button
                  onClick={() => setShowReasonInput(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Someone has requested admin access. Approving this request will grant them 
                  full administrative privileges including the ability to approve leaves, 
                  manage users, and configure organization settings.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-medium"
                >
                  {processing ? 'Processing...' : '✓ Approve Request'}
                </button>
                <button
                  onClick={handleDeny}
                  disabled={processing}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 font-medium"
                >
                  {processing ? 'Processing...' : '✗ Deny Request'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                The user will be notified via email about your decision.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}