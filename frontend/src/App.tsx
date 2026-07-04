import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useAuth from '@hooks/useAuth';
import FirstLoginPasswordChangeDialog from '@components/FirstLoginPasswordChangeDialog';
import { initializeCsrfToken } from '@services/api';

// Pages
import LoginPage from '@pages/LoginPage';
import DashboardPage from '@pages/DashboardPage';
import LeadsPage from '@pages/LeadsPage';
import AccountsPage from '@pages/AccountsPage';
import OpportunitiesPage from '@pages/OpportunitiesPage';
import ReportsPage from '@pages/ReportsPage';
import { ContractsPage } from '@pages/ContractsPage';
import { ProjectsPage } from '@pages/ProjectsPage';
import { InvoicesPage } from '@pages/InvoicesPage';
import { TicketsPage } from '@pages/TicketsPage';
import { AuditLogsPage } from '@pages/AuditLogsPage';
import { NotificationsPage } from '@pages/NotificationsPage';
import { UsersPage } from '@pages/UsersPage';
import { RolesPage } from '@pages/RolesPage';
import { ProductsPage } from '@pages/ProductsPage';
import { SettingsPage } from '@pages/SettingsPage';
import { ForgotPasswordPage } from '@pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@pages/ResetPasswordPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#ec4899',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
  },
});

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  module?: string;
  permission?: [string, string];
  anyPermission?: [string, string][];
}> = ({ children, module, permission, anyPermission }) => {
  const { user, canViewModule, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Module is not viewable for this role -> not reachable by URL either.
  if (module && !canViewModule(module)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission && !hasPermission(permission[0], permission[1])) {
    return <Navigate to="/dashboard" replace />;
  }

  // Reachable if the user has ANY of the listed permissions.
  if (anyPermission && !anyPermission.some(([m, a]) => hasPermission(m, a))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const RootRoute: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

function App() {
  const { loadUser, logout, refreshMe, requiresPasswordChange, clearPasswordChangeRequirement } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  useEffect(() => {
    // Verify session and initialize on app load
    const verifySession = async () => {
      // Restore any cached user immediately for a snappy first paint.
      loadUser();
      try {
        // Ensure the CSRF cookie exists, then load the canonical user +
        // permissions from the server. If the session is invalid this throws.
        await initializeCsrfToken();
        await refreshMe();
      } catch (error) {
        // Session is invalid, clear everything
        console.warn('Session verification failed, clearing auth');
        await logout();
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifySession();
  }, [loadUser, logout, refreshMe]);

  useEffect(() => {
    if (requiresPasswordChange) {
      setShowPasswordDialog(true);
    }
  }, [requiresPasswordChange]);

  // Show loading state while verifying session
  if (isVerifyingSession) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FirstLoginPasswordChangeDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onPasswordChanged={() => {
          setShowPasswordDialog(false);
          clearPasswordChangeRequirement();
        }}
      />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute module="leads">
                <LeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute module="accounts">
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/opportunities"
            element={
              <ProtectedRoute module="opportunities">
                <OpportunitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute module="reports">
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts"
            element={
              <ProtectedRoute module="contracts">
                <ContractsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute module="projects">
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute module="tickets">
                <TicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute anyPermission={[['audit_log', 'read'], ['admin', 'view_audit_log']]}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute anyPermission={[['users', 'read'], ['admin', 'manage_users']]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute permission={['admin', 'manage_roles']}>
                <RolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<RootRoute />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
