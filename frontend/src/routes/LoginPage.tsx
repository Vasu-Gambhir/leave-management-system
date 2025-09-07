import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { authAPI } from "../lib/api";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const [organizationDomain, setOrganizationDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const savedDomain = localStorage.getItem("temp_org_domain");

    if (code && savedDomain) {
      handleGoogleCallback(code, savedDomain);
      return;
    }

    if (user) {
      const isMaster = user.email === import.meta.env.VITE_MASTER_EMAIL;
      navigate(isMaster ? "/master-dashboard" : "/dashboard", {
        replace: true,
      });
    }
  }, [user, navigate]);

  const handleGoogleCallback = async (code: string, domain: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await authAPI.googleCallback(code, domain);
      const { token, user } = response.data;

      login(token, user);
      localStorage.removeItem("temp_org_domain");

      const isMaster = user.email === import.meta.env.VITE_MASTER_EMAIL;
      const redirectUrl = isMaster ? "/master-dashboard" : "/dashboard";

      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed");
      localStorage.removeItem("temp_org_domain");

      window.history.replaceState({}, document.title, "/login");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!organizationDomain) {
      setError("Please enter your organization domain");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authAPI.getGoogleAuthUrl();
      const { authUrl } = response.data;

      localStorage.setItem("temp_org_domain", organizationDomain);

      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to initiate login");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Authenticating...</p>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we verify your credentials
          </p>
        </div>
      </div>
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  if (code) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">
            Completing sign in...
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Almost there! Finalizing your authentication
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full -translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-indigo-200/20 to-pink-200/20 rounded-full translate-x-48 translate-y-48"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Main card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <span className="text-3xl">🏖️</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="mt-2 text-gray-600">
              Sign in to your organization account
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <div className="text-red-400">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="domain"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Organization Domain
              </label>
              <div className="relative">
                <input
                  id="domain"
                  name="domain"
                  type="text"
                  placeholder="e.g., techcorp.com"
                  value={organizationDomain}
                  onChange={(e) => setOrganizationDomain(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading || !organizationDomain}
              className="group relative w-full flex justify-center items-center py-3 px-6 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <svg className="w-5 h-5 mr-3 relative z-10" viewBox="0 0 24 24">
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
              <span className="relative z-10">Sign in with Google</span>
            </button>

            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <span className="font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">
                  Contact your administrator
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Secure authentication powered by Google OAuth 2.0
          </p>
        </div>
      </div>
    </div>
  );
}
