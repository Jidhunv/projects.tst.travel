import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@mui/material';
import { Delete as DeleteIcon, CheckCircle as ReadIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [showUnreadOnly]);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications', { params: { unreadOnly: showUnreadOnly } });
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.get('/notifications/count/unread');
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`, {});
      setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/mark-all/read', {});
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleViewDetails = (notification: any) => {
    setSelectedNotification(notification);
    setOpenDialog(true);
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, 'error' | 'warning' | 'success' | 'info' | 'default'> = {
      ContractExpiry: 'warning',
      InvoiceDue: 'error',
      UATApproval: 'info',
      PaymentReminder: 'warning',
      ProjectMilestone: 'success',
      TicketUpdate: 'info',
    };
    return colors[type] || 'default';
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4">Notifications</Typography>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="error">
                <Box />
              </Badge>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={showUnreadOnly ? 'contained' : 'outlined'}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? 'Show All' : 'Show Unread'}
            </Button>
            {unreadCount > 0 && (
              <Button variant="contained" color="success" onClick={handleMarkAllAsRead}>
                Mark All Read
              </Button>
            )}
          </Box>
        </Box>

        {notifications.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">
                {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <List sx={{ bgcolor: 'background.paper' }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
                onClick={() => handleViewDetails(notification)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: notification.isRead ? 400 : 600 }}>
                        {notification.title}
                      </Typography>
                      <Chip label={notification.type} color={getTypeColor(notification.type)} size="small" />
                      {!notification.isRead && <Chip label="New" color="error" size="small" />}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {!notification.isRead && (
                    <IconButton
                      edge="end"
                      aria-label="mark-read"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      size="small"
                      title="Mark as read"
                    >
                      <ReadIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedNotification?.title}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedNotification && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                  <Chip label={selectedNotification.type} color={getTypeColor(selectedNotification.type)} />
                  {selectedNotification.relatedEntityName && (
                    <Chip label={selectedNotification.relatedEntityName} />
                  )}
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedNotification.message}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </Typography>
                {selectedNotification.actionUrl && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      href={selectedNotification.actionUrl}
                      fullWidth
                    >
                      {selectedNotification.actionLabel || 'View Details'}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};
