import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import { Notifications as NotificationsIcon, Close as CloseIcon } from '@mui/icons-material';
import { api } from '@services/api';

interface ChangeNotification {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description?: string;
  user?: { firstName: string; lastName: string };
  createdAt: string;
}

export default function NotificationCenter() {
  const [changes, setChanges] = useState<ChangeNotification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load recent changes on mount and every 60 seconds
  useEffect(() => {
    const loadChanges = async () => {
      try {
        const response = await api.getRecentChanges(30, 20); // Last 30 days, max 20
        if (response.data.success) {
          setChanges(response.data.data || []);
          setUnreadCount((response.data.data || []).length);
        }
      } catch (error) {
        console.error('Error loading recent changes:', error);
      }
    };

    loadChanges();
    const interval = setInterval(loadChanges, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const handleOpenNotifications = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setUnreadCount(0); // Mark as read when opened
  };

  const handleCloseNotifications = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  const getActionColor = (action: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'info';
      case 'DELETE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTimeSince = (date: string): string => {
    const now = new Date();
    const then = new Date(date);
    const secondsAgo = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  };

  return (
    <>
      <IconButton
        aria-describedby={id}
        onClick={handleOpenNotifications}
        size="small"
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseNotifications}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.95) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }
        }}
      >
        <Box sx={{ width: 420, maxHeight: 600, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Recent Changes</Typography>
            <IconButton size="small" onClick={handleCloseNotifications} sx={{ color: 'white' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {changes.length === 0 ? (
            <Box sx={{ py: 4, px: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <Typography variant="body2" color="textSecondary" align="center">
                No recent changes in the last 30 days
              </Typography>
            </Box>
          ) : (
            <>
              <List sx={{ maxHeight: 450, overflow: 'auto', flex: 1, px: 1 }}>
                {changes.map((change, idx) => (
                  <React.Fragment key={change.id}>
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        py: 1.5,
                        px: 2,
                        borderRadius: 1.5,
                        background: 'rgba(99, 102, 241, 0.05)',
                        '&:hover': {
                          background: 'rgba(99, 102, 241, 0.1)',
                        },
                        transition: 'all 0.2s'
                      }}
                    >
                      <Box sx={{ display: 'flex', width: '100%', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={change.action}
                          size="small"
                          color={getActionColor(change.action) as any}
                          variant="filled"
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip
                          label={change.entityType?.toUpperCase() || 'UNKNOWN'}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: '#6366f1',
                            color: '#6366f1',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: '#0f172a',
                              mb: 0.5
                            }}
                          >
                            {change.description || `${change.action} ${change.entityType}`}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            {change.user ? `${change.user.firstName} ${change.user.lastName}` : 'System'} • {getTimeSince(change.createdAt)}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {idx < changes.length - 1 && <Divider sx={{ my: 0.5 }} />}
                  </React.Fragment>
                ))}
              </List>

              <Divider />
              <Button
                fullWidth
                size="small"
                href="/audit-logs"
                target="_blank"
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: 0,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  }
                }}
              >
                View All Changes →
              </Button>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
}
