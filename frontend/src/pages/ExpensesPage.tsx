import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, MenuItem, Select, Chip, OutlinedInput, InputLabel, FormControl, Checkbox, ListItemText,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';
import { exportToCsv } from '@utils/exportCsv';

const empty = { location: '', days: 1, accountIds: [] as string[], travelCost: 0, reason: '' };

const statusColor: Record<string, any> = { Pending: 'warning', Approved: 'success', Rejected: 'error' };

export const ExpensesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('expenses', 'create');
  const canDelete = hasPermission('expenses', 'delete');
  const canApprove = hasPermission('expenses', 'approve');

  const [rows, setRows] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const params: any = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const res = await api.getExpenses(params);
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
      await api.createExpense(form);
      setOpen(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to submit expense');
    }
  };
  const decide = async (id: string, decision: 'Approved' | 'Rejected') => {
    const notes = window.prompt(`Notes for ${decision.toLowerCase()} (optional):`) || undefined;
    try { await api.decideExpense(id, decision, notes); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    await api.deleteExpense(id);
    load();
  };

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name || id;

  const exportCsv = () => exportToCsv('expenses', [
    { header: 'Location', value: (r: any) => r.location },
    { header: 'Days', value: (r: any) => r.days },
    { header: 'Companies', value: (r: any) => (r.companyNames || []).join('; ') },
    { header: 'Travel Cost', value: (r: any) => r.travelCost },
    { header: 'Reason', value: (r: any) => r.reason },
    { header: 'Status', value: (r: any) => r.status },
    { header: 'Submitted By', value: (r: any) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '' },
    { header: 'Approver', value: (r: any) => r.approvedBy ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}` : '' },
  ], rows);

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4">Expense Management</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={exportCsv}>Export CSV</Button>
            {canCreate && <Button variant="contained" onClick={openNew}>New Expense</Button>}
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Search location/reason" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <TextField size="small" select sx={{ minWidth: 150 }} label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </TextField>
            <Button variant="contained" onClick={load}>Apply</Button>
            <Button onClick={() => { setFilters({ search: '', status: '' }); setTimeout(load, 0); }}>Clear</Button>
          </Stack>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Location</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Companies</TableCell>
                <TableCell>Travel Cost</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.location}</TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell>{(r.companyNames || []).join(', ') || '-'}</TableCell>
                  <TableCell>{Number(r.travelCost).toLocaleString()}</TableCell>
                  <TableCell sx={{ maxWidth: 220, whiteSpace: 'pre-wrap' }}>{r.reason || '-'}</TableCell>
                  <TableCell><Chip size="small" label={r.status} color={statusColor[r.status] || 'default'} /></TableCell>
                  <TableCell>{r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '-'}</TableCell>
                  <TableCell>
                    {canApprove && r.status === 'Pending' && (
                      <>
                        <Button size="small" color="success" onClick={() => decide(r.id, 'Approved')}>Approve</Button>
                        <Button size="small" color="error" onClick={() => decide(r.id, 'Rejected')}>Reject</Button>
                      </>
                    )}
                    {canDelete && <Button size="small" color="error" onClick={() => remove(r.id)}>Delete</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">No expenses yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>New Expense</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Travel Location (Where are you?)" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <TextField label="Number of Days" type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} />
              <FormControl>
                <InputLabel>Company Information</InputLabel>
                <Select
                  multiple
                  value={form.accountIds}
                  input={<OutlinedInput label="Company Information" />}
                  onChange={(e) => setForm({ ...form, accountIds: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((id) => <Chip key={id} size="small" label={accountName(id)} />)}
                    </Box>
                  )}
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      <Checkbox checked={form.accountIds.indexOf(a.id) > -1} />
                      <ListItemText primary={a.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="Cost of Travel" type="number" value={form.travelCost} onChange={(e) => setForm({ ...form, travelCost: Number(e.target.value) })} />
              <TextField label="Reason for Travel" multiline rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!form.location}>Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default ExpensesPage;
