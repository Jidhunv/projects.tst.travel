import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, Chip, Card, CardContent, useTheme,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

const empty = { name: '', code: '', description: '', displayOrder: 0 };

export const ProductCategoriesPage: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Categories are product master data, so they follow the products permissions.
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('products', 'create');
  const canUpdate = hasPermission('products', 'update');
  const canDelete = hasPermission('products', 'delete');

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getProductCategories();
      setRows(res.data.data || []);
      setError('');
    } catch (e: any) {
      console.error('Error loading product categories:', e);
      setError(e.response?.data?.error || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      name: r.name || '',
      code: r.code || '',
      description: r.description || '',
      displayOrder: r.displayOrder ?? 0,
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) await api.updateProductCategory(editing.id, form);
      else await api.createProductCategory(form);
      setOpen(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save category');
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Delete category "${row.name}"?`)) return;
    try {
      const res = await api.deleteProductCategory(row.id);
      // A category still used by products is deactivated rather than deleted;
      // surface whichever happened.
      const msg = (res.data as any)?.data?.message;
      if (msg) alert(msg);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete category');
    }
  };

  const toggleActive = async (row: any) => {
    try {
      await api.updateProductCategory(row.id, { isActive: !row.isActive });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to update category');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Product Categories</Typography>
          {canCreate && (
            <Button variant="contained" onClick={openNew}>
              Add Category
            </Button>
          )}
        </Box>

        {error && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography color="error">{error}</Typography>
              <Button size="small" onClick={load} sx={{ mt: 1 }}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && rows.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">
                No product categories yet. Add one to group your products.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: isDarkMode ? '#263238' : '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: isDarkMode ? '#e2e8f0' : 'inherit' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: isDarkMode ? '#e2e8f0' : 'inherit' }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: isDarkMode ? '#e2e8f0' : 'inherit' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: isDarkMode ? '#e2e8f0' : 'inherit' }}>Order</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: isDarkMode ? '#e2e8f0' : 'inherit' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: isDarkMode ? '#e2e8f0' : 'inherit' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{r.name}</TableCell>
                    <TableCell>{r.code || '-'}</TableCell>
                    <TableCell>{r.description || '-'}</TableCell>
                    <TableCell>{r.displayOrder ?? 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.isActive ? 'Active' : 'Inactive'}
                        color={r.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {canUpdate && (
                        <>
                          <Button size="small" variant="text" onClick={() => openEdit(r)}>Edit</Button>
                          <Button
                            size="small"
                            variant="text"
                            color={r.isActive ? 'warning' : 'success'}
                            onClick={() => toggleActive(r)}
                          >
                            {r.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </>
                      )}
                      {canDelete && (
                        <Button size="small" variant="text" color="error" onClick={() => remove(r)}>
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

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
              />
              <TextField
                label="Code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                helperText="Optional short code, e.g. SW or SVC"
                fullWidth
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                multiline
                rows={2}
                fullWidth
              />
              <TextField
                label="Display Order"
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                helperText="Lower numbers appear first in dropdowns"
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} variant="contained" disabled={!form.name.trim()}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default ProductCategoriesPage;
