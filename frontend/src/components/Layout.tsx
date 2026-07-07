import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Handshake as OpportunityIcon,
  BarChart as ReportsIcon,
  Logout as LogoutIcon,
  Description as ContractIcon,
  Assignment as ProjectIcon,
  Receipt as InvoiceIcon,
  BugReport as TicketIcon,
  History as AuditIcon,
  Notifications as NotificationIcon,
  PersonAdd as UserIcon,
  Security as SecurityIcon,
  Inventory as ProductIcon,
  LocalShipping as SupplierIcon,
  EventNote as VisitIcon,
  RequestQuote as ExpenseIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import useAuth from '@hooks/useAuth';
import NotificationCenter from './NotificationCenter';
import { usePendingFollowups } from '@hooks/usePendingFollowups';
import { Badge, IconButton } from '@mui/material';
import { useThemeContext } from '@context/ThemeContext';

const DRAWER_WIDTH = 240;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { logout, canViewModule, hasPermission } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { pendingCount } = usePendingFollowups();
  const { isDarkMode, toggleTheme } = useThemeContext();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // `show` gates each item by the user's View permission for its module.
  // Items with no permission module (Dashboard, Notifications, and reference
  // pages without a permission entry) are always visible.
  const allMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', show: true },
    { text: 'Accounts', icon: <BusinessIcon />, path: '/accounts', show: canViewModule('accounts') },
    { text: 'Leads', icon: <PeopleIcon />, path: '/leads', show: canViewModule('leads') },
    { text: 'Opportunities', icon: <OpportunityIcon />, path: '/opportunities', show: canViewModule('opportunities') },
    { text: 'Contracts', icon: <ContractIcon />, path: '/contracts', show: canViewModule('contracts') },
    { text: 'Projects', icon: <ProjectIcon />, path: '/projects', show: canViewModule('projects') },
    { text: 'Invoices', icon: <InvoiceIcon />, path: '/invoices', show: true },
    { text: 'Tickets', icon: <TicketIcon />, path: '/tickets', show: canViewModule('tickets') },
    { text: 'Products', icon: <ProductIcon />, path: '/products', show: true },
    { text: 'Suppliers', icon: <SupplierIcon />, path: '/suppliers', show: canViewModule('suppliers') },
    { text: 'Sales Report', icon: <VisitIcon />, path: '/sales-visits', show: canViewModule('sales_visits') },
    { text: 'Expenses', icon: <ExpenseIcon />, path: '/expenses', show: canViewModule('expenses') },
    { text: 'Notifications', icon: <NotificationIcon />, path: '/notifications', show: true },
    { text: 'Audit Logs', icon: <AuditIcon />, path: '/audit-logs', show: canViewModule('audit_log') || hasPermission('admin', 'view_audit_log') },
    { text: 'Users', icon: <UserIcon />, path: '/users', show: canViewModule('users') || hasPermission('admin', 'manage_users') },
    { text: 'Roles', icon: <SecurityIcon />, path: '/roles', show: hasPermission('admin', 'manage_roles') },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports', show: canViewModule('reports') },
  ];
  const menuItems = allMenuItems.filter((item) => item.show);

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#1e293b',
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            CRM System
          </Typography>
          <IconButton
            onClick={toggleTheme}
            sx={{ mr: 2, color: 'white' }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <NotificationCenter />
          <Avatar
            sx={{ cursor: 'pointer', bgcolor: '#6366f1' }}
            onClick={handleMenuOpen}
          >
            U
          </Avatar>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            marginTop: '64px',
          },
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
              sx={{
                '&:hover': {
                  bgcolor: '#f0f0f0',
                },
              }}
            >
              <ListItemIcon>
                {item.text === 'Sales Report' && pendingCount > 0 ? (
                  <Badge badgeContent={pendingCount} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          marginTop: '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
