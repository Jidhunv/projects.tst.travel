import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, TableSortLabel,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';
import { exportToCsv } from '@utils/exportCsv';

const empty = { name: '', contactPerson: '', email: '', phoneNumber: '', category: '', region: '', country: '', notes: '' };

export const SuppliersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('suppliers', 'create');
  const canUpdate = hasPermission('suppliers', 'update');
  const canDelete = hasPermission('suppliers', 'delete');

  const [rows, setRows] = useState<any[]>([]);
  const [filters, setFilters] = useState({ search: '', region: '', country: '', category: '' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const params: any = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const res = await api.getSuppliers(params);
    setRows(res.data.data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setForm({ ...empty, ...r }); setOpen(true); };

  const save = async () => {
    try {
      if (editing) await api.updateSupplier(editing.id, form);
      else await api.createSupplier(form);
      setOpen(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save supplier');
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this supplier?')) return;
    await api.deleteSupplier(id);
    load();
  };

  const exportCsv = () => exportToCsv('suppliers', [
    { header: 'Name', value: (r: any) => r.name },
    { header: 'Contact Person', value: (r: any) => r.contactPerson },
    { header: 'Email', value: (r: any) => r.email },
    { header: 'Phone', value: (r: any) => r.phoneNumber },
    { header: 'Category', value: (r: any) => r.category },
    { header: 'Region', value: (r: any) => r.region },
    { header: 'Country', value: (r: any) => r.country },
  ], rows);

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4">Supplier Master</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={exportCsv}>Export CSV</Button>
            {canCreate && <Button variant="contained" onClick={openNew}>Add Supplier</Button>}
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <TextField size="small" label="Region" value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} />
            <TextField size="small" label="Country" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })} />
            <TextField size="small" label="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
            <Button variant="contained" onClick={load}>Apply</Button>
            <Button onClick={() => { setFilters({ search: '', region: '', country: '', category: '' }); setTimeout(load, 0); }}>Clear</Button>
          </Stack>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><TableSortLabel active>Name</TableSortLabel></TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell>{r.contactPerson || '-'}</TableCell>
                  <TableCell>{r.email || '-'}</TableCell>
                  <TableCell>{r.phoneNumber || '-'}</TableCell>
                  <TableCell>{r.category || '-'}</TableCell>
                  <TableCell>{r.region || '-'}</TableCell>
                  <TableCell>{r.country || '-'}</TableCell>
                  <TableCell>
                    {canUpdate && <Button size="small" onClick={() => openEdit(r)}>Edit</Button>}
                    {canDelete && <Button size="small" color="error" onClick={() => remove(r.id)}>Delete</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">No suppliers yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <TextField label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              <TextField label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              <TextField label="Notes" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!form.name}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default SuppliersPage;
