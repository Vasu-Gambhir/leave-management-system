import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { authAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [organizationDomain, setOrganizationDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for OAuth callback code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const savedDomain = localStorage.getItem('temp_org_domain');

    if (code && savedDomain) {
      console.log('🔗 OAuth callback detected, processing...');
      handleGoogleCallback(code, savedDomain);
      return;
    }

    // If user is already logged in, redirect them
    if (user) {
      const isMaster = user.email === import.meta.env.VITE_MASTER_EMAIL;
      navigate(isMaster ? '/master-dashboard' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleCallback = async (code: string, domain: string) => {
    console.log('🚀 Processing OAuth callback in LoginPage...');
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.googleCallback(code, domain);
      const { token, user } = response.data;
      
      console.log('✅ OAuth success, logging in user:', user);
      
      login(token, user);
      localStorage.removeItem('temp_org_domain');
      
      // Redirect based on user type immediately
      const isMaster = user.email === import.meta.env.VITE_MASTER_EMAIL;
      const redirectUrl = isMaster ? '/master-dashboard' : '/dashboard';
      
      console.log('🎯 Redirecting to:', redirectUrl);
      
      // Immediate redirect without showing login page
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      console.error('❌ Google callback error:', err);
      setError(err.response?.data?.error || 'Authentication failed');
      localStorage.removeItem('temp_org_domain');
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/login');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!organizationDomain) {
      setError('Please enter your organization domain');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.getGoogleAuthUrl();
      const { authUrl } = response.data;
      
      // Save domain temporarily
      localStorage.setItem('temp_org_domain', organizationDomain);
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Error getting auth URL:', err);
      setError(err.response?.data?.error || 'Failed to initiate login');
      setLoading(false);
    }
  };

  // Show loading screen during OAuth processing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If we have OAuth code, don't show login form (processing in background)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <span className="text-2xl">🏖️</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Leave Management
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your organization account
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
              Organization Domain
            </label>
            <div className="mt-1">
              <input
                id="domain"
                name="domain"
                type="text"
                placeholder="e.g., techcorp.com"
                value={organizationDomain}
                onChange={(e) => setOrganizationDomain(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={loading || !organizationDomain}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account? Contact your administrator or{' '}
              <span className="font-medium text-blue-600">
                sign up as the first admin
              </span>{' '}
              for your organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}