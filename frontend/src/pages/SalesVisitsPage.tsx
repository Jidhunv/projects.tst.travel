import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, MenuItem,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';
import { exportToCsv } from '@utils/exportCsv';

const empty = { accountId: '', companyName: '', visitType: 'Visit', discussion: '', visitDate: new Date().toISOString().slice(0, 10) };

export const SalesVisitsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales_visits', 'create');
  const canDelete = hasPermission('sales_visits', 'delete');

  const [rows, setRows] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filters, setFilters] = useState({ search: '', accountId: '', visitType: '', fromDate: '', toDate: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const params: any = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const res = await api.getSalesVisits(params);
    setRows(res.data.data || []);
  };
  useEffect(() => {
    load();
    api.getAccounts(1, 200).then((r) => setAccounts(r.data.data || [])).catch(() => {});
    /* eslint-disable-next-line */
  }, []);

  const openNew = () => { setForm(empty); setOpen(true); };
  const save = async () => {
    try {
      const payload = { ...form };
      if (payload.accountId) {
        const acc = accounts.find((a) => a.id === payload.accountId);
        payload.companyName = acc?.name || payload.companyName;
      }
      await api.createSalesVisit(payload);
      setOpen(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save sales visit');
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this record?')) return;
    await api.deleteSalesVisit(id);
    load();
  };

  const exportCsv = () => exportToCsv('sales-report', [
    { header: 'Company', value: (r: any) => r.companyName || r.account?.name },
    { header: 'Type', value: (r: any) => r.visitType },
    { header: 'What Was Discussed', value: (r: any) => r.discussion },
    { header: 'Date of Visit/Call', value: (r: any) => r.visitDate ? new Date(r.visitDate).toLocaleDateString() : '' },
    { header: 'Created Date', value: (r: any) => new Date(r.createdAt).toLocaleString() },
    { header: 'Creator', value: (r: any) => r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : '' },
  ], rows);

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4">Sales Report (Visits / Calls)</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={exportCsv}>Export CSV</Button>
            {canCreate && <Button variant="contained" onClick={openNew}>Log Visit / Call</Button>}
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Search discussion" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <TextField size="small" select sx={{ minWidth: 180 }} label="Company" value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
            </TextField>
            <TextField size="small" select sx={{ minWidth: 120 }} label="Type" value={filters.visitType} onChange={(e) => setFilters({ ...filters, visitType: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Visit">Visit</MenuItem>
              <MenuItem value="Call">Call</MenuItem>
            </TextField>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
            <Button variant="contained" onClick={load}>Apply</Button>
            <Button onClick={() => { setFilters({ search: '', accountId: '', visitType: '', fromDate: '', toDate: '' }); setTimeout(load, 0); }}>Clear</Button>
          </Stack>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>What Was Discussed</TableCell>
                <TableCell>Date of Visit/Call</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Creator</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.companyName || r.account?.name || '-'}</TableCell>
                  <TableCell>{r.visitType}</TableCell>
                  <TableCell sx={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{r.discussion}</TableCell>
                  <TableCell>{r.visitDate ? new Date(r.visitDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : '-'}</TableCell>
                  <TableCell>{canDelete && <Button size="small" color="error" onClick={() => remove(r.id)}>Delete</Button>}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center">No sales visits logged yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Log Visit / Call</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Company Information" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <MenuItem value="">-- Select company --</MenuItem>
                {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
              <TextField select label="Type" value={form.visitType} onChange={(e) => setForm({ ...form, visitType: e.target.value })}>
                <MenuItem value="Visit">Visit</MenuItem>
                <MenuItem value="Call">Call</MenuItem>
              </TextField>
              <TextField label="What Was Discussed" required multiline rows={4} value={form.discussion} onChange={(e) => setForm({ ...form, discussion: e.target.value })} />
              <TextField label="Date of Visit / Call" type="date" InputLabelProps={{ shrink: true }} value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!form.discussion}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default SalesVisitsPage;
