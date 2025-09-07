import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./lib/auth";
import { NotificationProvider } from "./lib/notifications";
import { LoginPage } from "./routes/LoginPage";
import { DashboardPage } from "./routes/DashboardPage";
import { LeavesPage } from "./routes/LeavesPage";
import { ApprovalsPage } from "./routes/ApprovalsPage";
import { RequestAdminPage } from "./routes/RequestAdminPage";
import { AdminApprovalPage } from "./routes/AdminApprovalPage";
import { LeaveTypesPage } from "./routes/LeaveTypesPage";
import { UsersPage } from "./routes/UsersPage";
import { SettingsPage } from "./routes/SettingsPage";
import { MasterDashboard } from "./routes/MasterDashboard";
import { MasterOrganizations } from "./routes/MasterOrganizations";
import { MasterUsers } from "./routes/MasterUsers";
import { MasterRequests } from "./routes/MasterRequests";
import { AdminRequestsPage } from "./routes/AdminRequestsPage";
import { Layout } from "./components/Layout";
import "./index.css";

function AppRoutes() {
  const { user, loading } = useAuth();

  const isMaster = user?.email === import.meta.env.VITE_MASTER_EMAIL;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-approval" element={<AdminApprovalPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        {isMaster ? (
          <>
            <Route
              path="/"
              element={<Navigate to="/master-dashboard" replace />}
            />
            <Route path="/master-dashboard" element={<MasterDashboard />} />
            <Route
              path="/master-dashboard/organizations"
              element={<MasterOrganizations />}
            />
            <Route path="/master-dashboard/users" element={<MasterUsers />} />
            <Route
              path="/master-dashboard/requests"
              element={<MasterRequests />}
            />
            <Route
              path="/login"
              element={<Navigate to="/master-dashboard" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/master-dashboard" replace />}
            />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leaves" element={<LeavesPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/request-admin" element={<RequestAdminPage />} />
            <Route path="/leave-types" element={<LeaveTypesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin-requests" element={<AdminRequestsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/login"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10B981",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#EF4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
