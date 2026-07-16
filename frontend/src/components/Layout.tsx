import React, { useState } from 'react';
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
  Collapse,
  ListItemButton,
  Divider,
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
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  AdminPanelSettings as AdminIcon,
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
  const { logout, canViewModule, hasPermission, user } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { pendingCount } = usePendingFollowups();
  const { isDarkMode, toggleTheme } = useThemeContext();

  // State for collapsible menu groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    accountsManagement: true,
    billing: true,
    projectManagement: true,
    masters: false,
    sales: false,
    userManagement: false,
    logs: false,
  });

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  // Fall back to the email's first letter, then a generic glyph, so the avatar
  // never renders empty for a user with no name set.
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    'U';

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

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Organized menu structure with categories
  const menuStructure = [
    {
      key: 'main',
      type: 'item',
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      show: true,
    },
    { key: 'divider1', type: 'divider', show: true },
    {
      key: 'accountsManagement',
      type: 'group',
      title: 'Accounts Management',
      icon: <BusinessIcon />,
      show: true,
      items: [
        { text: 'Accounts', icon: <BusinessIcon />, path: '/accounts', show: canViewModule('accounts') },
        { text: 'Leads', icon: <PeopleIcon />, path: '/leads', show: canViewModule('leads') },
        { text: 'Opportunities', icon: <OpportunityIcon />, path: '/opportunities', show: canViewModule('opportunities') },
      ],
    },
    {
      key: 'billing',
      type: 'group',
      title: 'Billing & Operations',
      icon: <InvoiceIcon />,
      show: true,
      items: [
        { text: 'Invoices', icon: <InvoiceIcon />, path: '/invoices', show: canViewModule('invoices') },
        { text: 'Expenses', icon: <ExpenseIcon />, path: '/expenses', show: canViewModule('expenses') },
      ],
    },
    {
      key: 'projectManagement',
      type: 'group',
      title: 'Project Management',
      icon: <ProjectIcon />,
      show: true,
      items: [
        { text: 'Projects', icon: <ProjectIcon />, path: '/projects', show: canViewModule('projects') },
        { text: 'Contracts', icon: <ContractIcon />, path: '/contracts', show: canViewModule('contracts') },
        { text: 'Tickets', icon: <TicketIcon />, path: '/tickets', show: canViewModule('tickets') },
      ],
    },
    {
      key: 'masters',
      type: 'group',
      title: 'Masters',
      icon: <CategoryIcon />,
      show: true,
      items: [
        { text: 'Products', icon: <ProductIcon />, path: '/products', show: true },
        { text: 'Suppliers', icon: <SupplierIcon />, path: '/suppliers', show: canViewModule('suppliers') },
        { text: 'Categories', icon: <CategoryIcon />, path: '/categories', show: true },
      ],
    },
    {
      key: 'sales',
      type: 'group',
      title: 'Sales & Reports',
      icon: <ReportsIcon />,
      show: true,
      items: [
        { text: 'Sales Report', icon: <VisitIcon />, path: '/sales-visits', show: canViewModule('sales_visits'), badge: pendingCount },
        { text: 'Reports', icon: <ReportsIcon />, path: '/reports', show: canViewModule('reports') },
      ],
    },
    { key: 'divider2', type: 'divider', show: true },
    {
      key: 'userManagement',
      type: 'group',
      title: 'User Management',
      icon: <AdminIcon />,
      show: hasPermission('admin', 'manage_users') || hasPermission('admin', 'manage_roles'),
      items: [
        { text: 'Users', icon: <UserIcon />, path: '/users', show: canViewModule('users') || hasPermission('admin', 'manage_users') },
        { text: 'Roles', icon: <SecurityIcon />, path: '/roles', show: hasPermission('admin', 'manage_roles') },
      ],
    },
    {
      key: 'logs',
      type: 'group',
      title: 'Logs',
      icon: <AuditIcon />,
      show: canViewModule('audit_log') || hasPermission('admin', 'view_audit_log'),
      items: [
        { text: 'Audit Logs', icon: <AuditIcon />, path: '/audit-logs', show: canViewModule('audit_log') || hasPermission('admin', 'view_audit_log') },
      ],
    },
    { key: 'divider3', type: 'divider', show: true },
    {
      key: 'notifications',
      type: 'item',
      text: 'Notifications',
      icon: <NotificationIcon />,
      path: '/notifications',
      show: true,
    },
  ];

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
            title={fullName || 'Account'}
          >
            {initials}
          </Avatar>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            slotProps={{ paper: { sx: { minWidth: 240 } } }}
          >
            {/* Profile summary. Not a MenuItem: it is information, not an action. */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                {fullName || 'Signed in'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.email || '-'}
              </Typography>
              {user?.role?.name && (
                <Typography variant="caption" color="text.secondary">
                  {user.role.name}
                </Typography>
              )}
            </Box>
            <Divider />
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
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#e2e8f0' : '#000000',
          },
          '& .MuiListItemText-primary': {
            color: isDarkMode ? '#e2e8f0' : 'inherit',
          },
          '& .MuiListItemIcon-root': {
            color: isDarkMode ? '#94a3b8' : 'inherit',
          },
        }}
      >
        <List sx={{ pt: 1 }}>
          {menuStructure.map((section) => {
            if (!section.show) return null;

            if (section.type === 'divider') {
              return <Divider key={section.key} sx={{ my: 1 }} />;
            }

            if (section.type === 'item') {
              return (
                <ListItem
                  button
                  key={section.key}
                  onClick={() => navigate(section.path!)}
                  sx={{
                    '&:hover': {
                      bgcolor: isDarkMode ? '#2a3441' : '#f0f0f0',
                    },
                  }}
                >
                  <ListItemIcon>{section.icon}</ListItemIcon>
                  <ListItemText primary={section.text} />
                </ListItem>
              );
            }

            if (section.type === 'group') {
              const visibleItems = section.items!.filter((item) => item.show);
              if (visibleItems.length === 0) return null;

              return (
                <React.Fragment key={section.key}>
                  <ListItemButton
                    onClick={() => toggleGroup(section.key)}
                    sx={{
                      '&:hover': {
                        bgcolor: isDarkMode ? '#2a3441' : '#f0f0f0',
                      },
                    }}
                  >
                    <ListItemIcon>{section.icon}</ListItemIcon>
                    <ListItemText
                      primary={section.title}
                      primaryTypographyProps={{
                        sx: { fontWeight: 600, fontSize: '0.95rem' }
                      }}
                    />
                    {expandedGroups[section.key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  <Collapse in={expandedGroups[section.key]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {visibleItems.map((item) => (
                        <ListItem
                          button
                          key={item.text}
                          onClick={() => navigate(item.path)}
                          sx={{
                            pl: 4,
                            '&:hover': {
                              bgcolor: isDarkMode ? '#2a3441' : '#f0f0f0',
                            },
                          }}
                        >
                          <ListItemIcon>
                            {item.badge && item.badge > 0 ? (
                              <Badge badgeContent={item.badge} color="error">
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
                  </Collapse>
                </React.Fragment>
              );
            }

            return null;
          })}
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
