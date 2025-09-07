import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  UserIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../lib/auth";
import { profileAPI } from "../lib/api";
import { NotificationCenter } from "./NotificationCenter";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    bio: "",
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout, isAdmin, canApprove, loading } = useAuth();
  const location = useLocation();

  const getNavLinkClass = (path: string) => {
    const isActive = location.pathname === path;
    return isActive
      ? "text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg font-semibold transition-all duration-200 shadow-sm"
      : "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: (user as any).phone || "",
        bio: (user as any).bio || "",
      });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = async () => {
    try {
      await profileAPI.deleteAccount();
      toast.success("Account deleted successfully");
      logout();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete account");
    }
    setShowDeleteModal(false);
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await profileAPI.updateProfile(profileForm);
      toast.success("Profile updated successfully");
      setShowEditProfileModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    }
  };

  const isMaster = user?.email === import.meta.env.VITE_MASTER_EMAIL;

  if (loading) {
    return (
      <nav className="shadow-lg border-b border-gray-100 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🏖️</span>
              <span className="text-xl font-bold text-gray-800 tracking-tight">
                Leave Management
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
              <div className="w-24 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="shadow-xl border-b border-gray-100 backdrop-blur-sm bg-white/95 sticky top-0 z-50">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            {/* Logo - Left */}
            <div className="flex items-center flex-shrink-0">
              <Link
                to="/"
                className="flex items-center group hover:scale-105 transition-transform duration-200 cursor-pointer"
              >
                <span className="text-3xl mr-3 group-hover:animate-bounce">
                  🏖️
                </span>
                <span className="hidden lg:block text-xl font-bold text-gray-800 tracking-tight">
                  Leave Management
                </span>
                <span className="lg:hidden text-lg font-bold text-gray-800 tracking-tight">
                  LM
                </span>
              </Link>
            </div>

            {/* Navigation Links - Center (Desktop only) */}
            <div className="hidden xl:flex flex-1 items-center justify-center px-4">
              <div className="flex items-center space-x-4 lg:space-x-6">
                {user && !isMaster && (
                  <>
                    <Link
                      to="/dashboard"
                      className={getNavLinkClass("/dashboard")}
                    >
                      Dashboard
                    </Link>
                    <Link to="/leaves" className={getNavLinkClass("/leaves")}>
                      My Leaves
                    </Link>
                    {canApprove && (
                      <Link
                        to="/approvals"
                        className={getNavLinkClass("/approvals")}
                      >
                        Approvals
                      </Link>
                    )}
                    {user.role === "team_member" && (
                      <Link
                        to="/request-admin"
                        className={getNavLinkClass("/request-admin")}
                      >
                        Request Admin
                      </Link>
                    )}
                    {isAdmin && (
                      <>
                        <Link
                          to="/leave-types"
                          className={getNavLinkClass("/leave-types")}
                        >
                          Leave Types
                        </Link>
                        <Link to="/users" className={getNavLinkClass("/users")}>
                          Users
                        </Link>
                        <Link
                          to="/admin-requests"
                          className={getNavLinkClass("/admin-requests")}
                        >
                          Admin Requests
                        </Link>
                        <Link
                          to="/settings"
                          className={getNavLinkClass("/settings")}
                        >
                          Settings
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* User Profile & Dropdown - Right */}
            <div className="flex items-center space-x-4">
              {/* Notification Center */}
              {user && !isMaster && <NotificationCenter />}

              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-indigo-100 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      {user.profile_picture ? (
                        <img
                          className="h-9 w-9 rounded-full ring-2 ring-indigo-100 hover:ring-indigo-200 transition-all duration-200"
                          src={user.profile_picture}
                          alt={user.name}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                          <span className="text-sm font-semibold text-white">
                            {user.name?.charAt(0).toUpperCase() ||
                              user.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="hidden sm:block text-left">
                        <p className="text-sm font-semibold text-gray-800">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-indigo-600 font-medium">
                          {isMaster
                            ? "🌟 Master"
                            : user.role?.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" />
                  </button>

                  {/* User Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-xl shadow-2xl border border-gray-100 py-2 z-50 backdrop-blur-sm bg-white/95">
                      <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                        <p className="text-sm font-semibold text-gray-800">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-indigo-600 font-medium">
                          {isMaster
                            ? "🌟 Master"
                            : user.role?.replace("_", " ")}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setShowEditProfileModal(true);
                          setUserDropdownOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 transition-all duration-200 cursor-pointer rounded-lg mx-2 font-medium"
                      >
                        <PencilIcon className="h-4 w-4 mr-3 text-indigo-500" />
                        Edit Profile
                      </button>

                      <button
                        onClick={() => {
                          setShowDeleteModal(true);
                          setUserDropdownOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 cursor-pointer rounded-lg mx-2 font-medium"
                      >
                        <TrashIcon className="h-4 w-4 mr-3 text-red-500" />
                        Delete Account
                      </button>

                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 hover:text-gray-800 transition-all duration-200 cursor-pointer rounded-lg mx-2 font-medium"
                        >
                          <UserIcon className="h-4 w-4 mr-3 text-gray-500" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Login
                </Link>
              )}

              {/* Mobile menu button */}
              <div className="xl:hidden ml-4">
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
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && user && (
          <div className="xl:hidden bg-white border-t border-gray-200">
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
                  {user.role === "team_member" && (
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
                        to="/admin-requests"
                        className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin Requests
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
            </div>
          </div>
        )}
      </nav>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="relative p-6 border w-96 shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <TrashIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete Account
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to permanently delete your account? This
                action cannot be undone and you will lose all your data.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          onClick={() => setShowEditProfileModal(false)}
        >
          <div
            className="relative p-6 border w-96 shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bio: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about yourself"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
