import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import useAuth from '@hooks/useAuth';
import FirstLoginPasswordChangeDialog from '@components/FirstLoginPasswordChangeDialog';
import ErrorBoundary from '@components/ErrorBoundary';
import { initializeCsrfToken } from '@services/api';
import { ThemeContextProvider } from '@context/ThemeContext';

// Pages - lazy-loaded so each route is its own chunk instead of all ~25
// pages shipping in the single initial bundle (was flagged by the build as
// a 1.1MB+ chunk). LoginPage stays eager since it's the very first thing an
// unauthenticated visitor needs, with nothing to gain from splitting it out.
import LoginPage from '@pages/LoginPage';
const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const LeadsPage = lazy(() => import('@pages/LeadsPage'));
const AccountsPage = lazy(() => import('@pages/AccountsPage'));
const ImportPage = lazy(() => import('@pages/ImportPage'));
const OpportunitiesPage = lazy(() => import('@pages/OpportunitiesPage'));
const ReportsPage = lazy(() => import('@pages/ReportsPage'));
const PerformancePage = lazy(() => import('@pages/PerformancePage'));
const MyKpisPage = lazy(() => import('@pages/MyKpisPage'));
const MeetingReportPage = lazy(() => import('@pages/MeetingReportPage'));
const KpiMasterPage = lazy(() => import('@pages/KpiMasterPage'));
const KpiConfigPage = lazy(() => import('@pages/KpiConfigPage'));
const SalesHealthPage = lazy(() => import('@pages/SalesHealthPage'));
const ContractsPage = lazy(() => import('@pages/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const ProjectsPage = lazy(() => import('@pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const InvoicesPage = lazy(() => import('@pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const TicketsPage = lazy(() => import('@pages/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const AuditLogsPage = lazy(() => import('@pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const NotificationsPage = lazy(() => import('@pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const UsersPage = lazy(() => import('@pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import('@pages/RolesPage').then((m) => ({ default: m.RolesPage })));
const ProductsPage = lazy(() => import('@pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const ProductCategoriesPage = lazy(() => import('@pages/ProductCategoriesPage'));
const CountriesPage = lazy(() => import('@pages/CountriesPage'));
const DesignationsPage = lazy(() => import('@pages/DesignationsPage'));
const TeamsPage = lazy(() => import('@pages/TeamsPage'));
const SuppliersPage = lazy(() => import('@pages/SuppliersPage'));
const SalesVisitsPage = lazy(() => import('@pages/SalesVisitsPage'));
const ExpensesPage = lazy(() => import('@pages/ExpensesPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ForgotPasswordPage = lazy(() => import('@pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const FixOpportunityDatesPage = lazy(() => import('@pages/admin/FixOpportunityDatesPage'));

const RouteLoadingFallback: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  module?: string;
  permission?: [string, string];
  anyPermission?: [string, string][];
  adminOnly?: boolean;
}> = ({ children, module, permission, anyPermission, adminOnly }) => {
  const { user, canViewModule, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role?.name !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
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
      <ThemeContextProvider>
        <CssBaseline />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </ThemeContextProvider>
    );
  }

  return (
    <ThemeContextProvider>
      <CssBaseline />
      <ErrorBoundary>
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
          <Suspense fallback={<RouteLoadingFallback />}>
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
            path="/import-midt"
            element={
              <ProtectedRoute adminOnly>
                <ImportPage />
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
            path="/performance"
            element={
              <ProtectedRoute module="reports">
                <PerformancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-kpis"
            element={
              <ProtectedRoute module="kpis">
                <MyKpisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meeting-report"
            element={
              <ProtectedRoute module="kpis">
                <MeetingReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpi-master"
            element={
              <ProtectedRoute module="kpi_setup">
                <KpiMasterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpi-config"
            element={
              <ProtectedRoute module="kpi_setup">
                <KpiConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-health"
            element={
              <ProtectedRoute module="reports">
                <SalesHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fix-opportunity-dates"
            element={
              <ProtectedRoute adminOnly>
                <FixOpportunityDatesPage />
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
          <Route
            path="/product-categories"
            element={
              <ProtectedRoute module="product_categories">
                <ProductCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/countries"
            element={
              <ProtectedRoute>
                <CountriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/designations"
            element={
              <ProtectedRoute>
                <DesignationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <TeamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute module="suppliers">
                <SuppliersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-visits"
            element={
              <ProtectedRoute module="sales_visits">
                <SalesVisitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute module="expenses">
                <ExpensesPage />
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
          </Suspense>
        </Router>
      </ErrorBoundary>
    </ThemeContextProvider>
  );
}

export default App;
