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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RootRoute: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

function App() {
  const { loadUser, logout, requiresPasswordChange, clearPasswordChangeRequirement } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  useEffect(() => {
    // Verify session and initialize on app load
    const verifySession = async () => {
      try {
        // Try to verify session by calling GET /users/me
        await initializeCsrfToken();
        // If successful, restore user from localStorage
        loadUser();
      } catch (error) {
        // Session is invalid, clear everything
        console.warn('Session verification failed, clearing auth');
        await logout();
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifySession();
  }, [loadUser, logout]);

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
              <ProtectedRoute>
                <LeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/opportunities"
            element={
              <ProtectedRoute>
                <OpportunitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <ContractsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
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
              <ProtectedRoute>
                <TicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute>
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
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute>
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
