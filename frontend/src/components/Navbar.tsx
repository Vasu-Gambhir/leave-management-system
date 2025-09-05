import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/auth';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin, canApprove, loading } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Check if user is the master user
  const isMaster = user?.email === import.meta.env.VITE_MASTER_EMAIL;
  
  // Debug logging
  console.log('🎯 Navbar Debug:', { 
    user: user, 
    masterEmail: import.meta.env.VITE_MASTER_EMAIL,
    isMaster,
    loading 
  });

  // Show loading skeleton for navbar
  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl mr-2">🏖️</span>
              <span className="text-xl font-bold text-gray-900">Leave Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16">
          {/* Logo - Left */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl mr-2">🏖️</span>
              <span className="text-xl font-bold text-gray-900">Leave Management</span>
            </Link>
          </div>

          {/* Navigation Links - Center */}
          <div className="flex-1 flex items-center justify-center">
            <div className="hidden md:flex items-center space-x-6">
            {user && !isMaster && (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
                <Link to="/leaves" className="text-gray-700 hover:text-blue-600">
                  My Leaves
                </Link>
                {canApprove && (
                  <Link to="/approvals" className="text-gray-700 hover:text-blue-600">
                    Approvals
                  </Link>
                )}
                {user.role === 'team_member' && (
                  <Link to="/request-admin" className="text-gray-700 hover:text-blue-600">
                    Request Admin
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <Link to="/leave-types" className="text-gray-700 hover:text-blue-600">
                      Leave Types
                    </Link>
                    <Link to="/users" className="text-gray-700 hover:text-blue-600">
                      Users
                    </Link>
                    <Link to="/settings" className="text-gray-700 hover:text-blue-600">
                      Settings
                    </Link>
                  </>
                )}
              </>
            )}

            </div>
          </div>

          {/* User Profile & Logout - Right */}
          <div className="flex items-center">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  {user.profile_picture ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.profile_picture}
                      alt={user.name}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isMaster ? '🌟 Master' : user.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            )}

            {!user && (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-gray-900 p-2"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {!isMaster && (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/leaves"
                  className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Leaves
                </Link>
                {canApprove && (
                  <Link
                    to="/approvals"
                    className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Approvals
                  </Link>
                )}
                {user.role === 'team_member' && (
                  <Link
                    to="/request-admin"
                    className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Request Admin
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <Link
                      to="/leave-types"
                      className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Leave Types
                    </Link>
                    <Link
                      to="/users"
                      className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Users
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </>
                )}
              </>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}