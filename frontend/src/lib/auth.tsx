import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI, type User } from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isApprovalManager: boolean;
  canApprove: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("auth_token");
      const savedUser = localStorage.getItem("user");

      if (token) {
        try {
          if (savedUser) {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setLoading(false);
          }

          const response = await authAPI.getCurrentUser();

          const serverUser = response.data;
          const savedUserData = savedUser ? JSON.parse(savedUser) : null;

          if (savedUserData && serverUser.email !== savedUserData.email) {
            console.warn("⚠️ Server user email mismatch!", {
              saved: savedUserData.email,
              server: serverUser.email,
            });
            return;
          }

          setUser(serverUser);
          localStorage.setItem("user", JSON.stringify(serverUser));
        } catch (error) {
          console.error("❌ Token validation failed:", error);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          setUser(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    // Listen for user updates from websocket
    const handleUserUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail;
      setUser(updatedUser);
    };

    window.addEventListener('userUpdated', handleUserUpdate as EventListener);

    initAuth();

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
    };
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      localStorage.removeItem("temp_org_domain");
      setUser(null);
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const isApprovalManager = user?.role === "approval_manager";
  const canApprove = isAdmin || isApprovalManager;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isApprovalManager,
        canApprove,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireApproval = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireApproval?: boolean;
}) {
  const { user, loading, isAdmin, canApprove } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requireApproval && !canApprove) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You need approval manager privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
