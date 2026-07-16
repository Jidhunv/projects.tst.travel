import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Chip,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    roleId: '',
    password: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get('/roles');
      setRoles(response.data.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber || '',
        roleId: user.roleId || '',
        password: '',
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        roleId: '',
        password: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (selectedUser) {
        const updateData: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          roleId: formData.roleId,
        };
        // Only send the password when the admin actually set one, so we don't
        // overwrite the existing password with an empty value.
        if (formData.password) {
          updateData.password = formData.password;
        }
        const response = await apiClient.patch(`/users/${selectedUser.id}`, updateData);
        setUsers(users.map((u) => (u.id === selectedUser.id ? response.data.data : u)));
        if (formData.password) {
          alert('Password updated for this user.');
        }
      } else {
        const response = await apiClient.post('/users', formData);
        setUsers([...users, response.data.data]);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const endpoint = isActive ? `/users/${userId}/deactivate` : `/users/${userId}/activate`;
      const response = await apiClient.patch(endpoint, {});
      setUsers(users.map((u) => (u.id === userId ? response.data.data : u)));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiClient.delete(`/users/${userId}`);
        setUsers(users.filter((u) => u.id !== userId));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleResetPassword = async (user: any) => {
    setSelectedUser(user);
    setOpenPasswordDialog(true);
    try {
      const response = await apiClient.post(`/users/${user.id}/reset-password`, {});
      setTempPassword(response.data.data.tempPassword || '');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
    }
  };

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAutoGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData({ ...formData, password: newPassword });
  };

  const handleCopyPassword = () => {
    if (formData.password) {
      navigator.clipboard.writeText(formData.password);
      alert('Password copied to clipboard!');
    }
  };

  const handleCopyResetPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    alert('Password copied to clipboard!');
  };

  const handleSendPasswordEmail = async () => {
    try {
      await apiClient.post(`/users/${selectedUser.id}/send-invite`, {});
      alert('Password reset email sent!');
      setOpenPasswordDialog(false);
    } catch (error) {
      console.error('Error sending password email:', error);
      alert('Failed to send password email');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">User Management</Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            Add User
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h6">{users.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Users
                </Typography>
                <Typography variant="h6">{users.filter((u) => u.isActive).length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Inactive Users
                </Typography>
                <Typography variant="h6">{users.filter((u) => !u.isActive).length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {users.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">No users yet</Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={typeof user.role === 'object' ? user.role?.name : user.role || 'No Role'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.phoneNumber || '-'}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenDialog(user)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="info"
                        onClick={() => handleResetPassword(user)}
                      >
                        Reset Password
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color={user.isActive ? 'warning' : 'success'}
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="small" variant="text" color="error" onClick={() => handleDeleteUser(user.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!selectedUser}
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label={selectedUser ? "New Password (optional)" : "Password"}
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                sx={{ mb: 1 }}
                placeholder="Enter password or auto-generate"
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleAutoGeneratePassword}
                >
                  🔄 Auto-Generate
                </Button>
                {formData.password && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleCopyPassword}
                  >
                    📋 Copy
                  </Button>
                )}
              </Box>
            </Box>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Role"
              select
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Reset Password - {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Temporary password has been generated for this user:
            </Typography>
            <Card sx={{ p: 2, bgcolor: 'action.hover', mb: 2 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold' }}>
                {tempPassword || 'Loading...'}
              </Typography>
            </Card>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 2 }}>
              The user will be required to change this password when they first log in.
            </Typography>
            <Box sx={{ mb: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: '#1976d2' }}>
                <strong>Next steps:</strong>
                <br />
                1. Share the temporary password with the user
                <br />
                2. User logs in and changes password
                <br />
                3. User gains access to the system
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPasswordDialog(false)}>Close</Button>
            {tempPassword && (
              <>
                <Button variant="outlined" onClick={handleCopyResetPassword}>
                  📋 Copy Password
                </Button>
                <Button variant="contained" color="info" onClick={handleSendPasswordEmail}>
                  ✉️ Send Email
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};
