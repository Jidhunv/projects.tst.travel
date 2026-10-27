import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, Chip, Card, CardContent,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

// Task Category master: the choices offered in the Task Manager dropdown.
const empty = { name: '' };

export const TaskCategoriesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('task_categories', 'create');
  const canUpdate = hasPermission('task_categories', 'update');
  const canDelete = hasPermission('task_categories', 'delete');

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saveError, setSaveError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getTaskCategories();
      setRows(res.data.data || []);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not load task categories.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setSaveError(''); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ name: r.name || '' }); setSaveError(''); setOpen(true); };

  const save = async () => {
    setSaveError('');
    try {
      if (editing) await api.updateTaskCategory(editing.id, form);
      else await api.createTaskCategory(form);
      setOpen(false);
      load();
    } catch (e: any) {
      setSaveError(e.response?.data?.error || 'Could not save the category');
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Delete category "${row.name}"?`)) return;
    try {
      const res = await api.deleteTaskCategory(row.id);
      const msg = (res.data as any)?.data?.message;
      if (msg) window.alert(msg);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not delete the category');
    }
  };

  const toggleActive = async (row: any) => {
    try {
      await api.updateTaskCategory(row.id, { isActive: !row.isActive });
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not update the category');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Task Categories</Typography>
          {canCreate && <Button variant="contained" onClick={openNew}>Add Category</Button>}
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
              <Typography color="textSecondary">No categories yet. Add one for the Task Manager dropdown.</Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{r.name}</TableCell>
                    <TableCell>
                      <Chip label={r.isActive ? 'Active' : 'Inactive'} color={r.isActive ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                      {canUpdate && (
                        <>
                          <Button size="small" variant="text" onClick={() => openEdit(r)}>Edit</Button>
                          <Button size="small" variant="text" color={r.isActive ? 'warning' : 'success'} onClick={() => toggleActive(r)}>
                            {r.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </>
                      )}
                      {canDelete && (
                        <Button size="small" variant="text" color="error" onClick={() => remove(r)}>Delete</Button>
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
                helperText="e.g. Development, General Sales, Operations"
                fullWidth
              />
              {saveError && <Typography color="error">{saveError}</Typography>}
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

export default TaskCategoriesPage;
