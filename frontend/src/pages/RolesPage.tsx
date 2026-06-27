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
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get('/roles');
      setRoles(response.data.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await apiClient.get('/roles/permissions/list');
      setPermissions(response.data.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleOpenDialog = (role?: any) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
      });
    } else {
      setSelectedRole(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      if (selectedRole) {
        const response = await apiClient.patch(`/roles/${selectedRole.id}`, formData);
        setRoles(roles.map((r) => (r.id === selectedRole.id ? response.data.data : r)));
      } else {
        const response = await apiClient.post('/roles', formData);
        setRoles([...roles, response.data.data]);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleOpenPermissionDialog = (role: any) => {
    setSelectedRole(role);
    setSelectedPermissions(new Set(role.permissions?.map((p: any) => p.id) || []));
    setOpenPermissionDialog(true);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const newPermissions = new Set(selectedPermissions);
    if (checked) {
      newPermissions.add(permissionId);
    } else {
      newPermissions.delete(permissionId);
    }
    setSelectedPermissions(newPermissions);
  };

  const handleSavePermissions = async () => {
    try {
      if (!selectedRole) {
        alert('No role selected');
        return;
      }

      const permissionIds = Array.from(selectedPermissions);
      console.log('Saving permissions for role:', selectedRole.id, 'Permissions:', permissionIds);

      const response = await apiClient.patch(`/roles/${selectedRole.id}/permissions`, {
        permissionIds,
      });

      if (response.data.success) {
        alert('Permissions saved successfully!');
        setRoles(roles.map((r) => (r.id === selectedRole.id ? response.data.data : r)));
        setOpenPermissionDialog(false);
      } else {
        alert('Failed to save permissions: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      console.error('Error saving permissions:', error);
      alert('Error saving permissions: ' + errorMessage);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await apiClient.delete(`/roles/${roleId}`);
        setRoles(roles.filter((r) => r.id !== roleId));
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const groupPermissions = () => {
    const grouped: { [key: string]: any[] } = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    return grouped;
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Role Management</Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            Add Role
          </Button>
        </Box>

        {roles.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">No roles yet</Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Role Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{role.name}</TableCell>
                    <TableCell>{role.description || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {role.permissions?.slice(0, 3).map((perm: any) => (
                          <Chip key={perm.id} label={`${perm.module}:${perm.action}`} size="small" />
                        ))}
                        {role.permissions?.length > 3 && (
                          <Chip label={`+${role.permissions.length - 3}`} size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenDialog(role)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="info"
                        onClick={() => handleOpenPermissionDialog(role)}
                      >
                        Permissions
                      </Button>
                      {!['Admin', 'Manager', 'Sales Rep'].includes(role.name) && (
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Role Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openPermissionDialog} onClose={() => setOpenPermissionDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Manage Permissions - {selectedRole?.name}</DialogTitle>
          <DialogContent sx={{ pt: 2, maxHeight: 600, overflow: 'auto' }}>
            <Stack spacing={3}>
              {Object.entries(groupPermissions()).map(([module, perms]) => {
                // Create matrix: rows are actions (View, Add, Update, Delete, Bulk Update)
                // columns are scopes (Self, All)
                const actions = ['read', 'create', 'update', 'delete'];
                const actionLabels: { [key: string]: string } = {
                  read: 'View',
                  create: 'Add',
                  update: 'Update',
                  delete: 'Delete',
                };

                return (
                  <Box key={module}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textTransform: 'uppercase', color: '#1976d2' }}>
                      {module}
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small" sx={{ backgroundColor: '#fafafa' }}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                            <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Action</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Self</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>All</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {actions.map((action) => (
                            <TableRow key={`${module}-${action}`}>
                              <TableCell sx={{ fontWeight: 500 }}>
                                {actionLabels[action]}
                              </TableCell>
                              {['self', 'all'].map((scope) => {
                                const perm = perms.find((p: any) => p.action === action && p.scope === scope);
                                return (
                                  <TableCell align="center" key={`${module}-${action}-${scope}`}>
                                    {perm ? (
                                      <Checkbox
                                        checked={selectedPermissions.has(perm.id)}
                                        onChange={(e) => handlePermissionChange(perm.id, e.target.checked)}
                                      />
                                    ) : (
                                      <Typography variant="caption" color="textSecondary">-</Typography>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                );
              })}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPermissionDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePermissions} variant="contained">
              Save Permissions
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};
