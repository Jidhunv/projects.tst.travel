import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, MenuItem, Checkbox, FormControlLabel, Card, CardContent, Chip,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';
import { exportToCsv } from '@utils/exportCsv';

const empty = {
  accountId: '',
  companyName: '',
  visitType: 'Visit',
  discussion: '',
  visitDate: new Date().toISOString().slice(0, 10),
  followupDate: '',
  followupCompleted: false,
  followupNotes: '',
};

export const SalesVisitsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales_visits', 'create');
  const canUpdate = hasPermission('sales_visits', 'update');
  const canDelete = hasPermission('sales_visits', 'delete');

  const [rows, setRows] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filters, setFilters] = useState({ search: '', accountId: '', visitType: '', fromDate: '', toDate: '' });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);

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

  const openNew = () => {
    setEditingId(null);
    setForm(empty);
    setVisitHistory([]);
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEditingId(r.id);

    // Load company name from account if not stored
    const companyName = r.companyName || accounts.find((a) => a.id === r.accountId)?.name || '';

    setForm({
      accountId: r.accountId || '',
      companyName,
      visitType: r.visitType || 'Visit',
      discussion: r.discussion || '',
      visitDate: r.visitDate ? new Date(r.visitDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      followupDate: r.followupDate ? new Date(r.followupDate).toISOString().slice(0, 10) : '',
      followupCompleted: r.followupCompleted || false,
      followupNotes: r.followupNotes || '',
    });

    // Load ALL visits history for this account (including current one)
    // This shows all visits and followups for the company
    const history = rows
      .filter((v) => v.accountId === r.accountId)
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
    setVisitHistory(history);
    setOpen(true);
  };
  const save = async () => {
    try {
      const payload = { ...form };
      if (payload.accountId) {
        const acc = accounts.find((a) => a.id === payload.accountId);
        payload.companyName = acc?.name || payload.companyName;
      }
      if (editingId) {
        await api.updateSalesVisit(editingId, payload);
      } else {
        await api.createSalesVisit(payload);
      }

      // Reload data and close dialog
      await load();

      // If we were in edit mode, reload history to show the new visit
      if (payload.accountId) {
        // Small delay to ensure data is loaded
        setTimeout(() => {
          handleAccountChange(payload.accountId);
        }, 100);
      }

      setOpen(false);
      setForm(empty);
      setEditingId(null);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save sales visit');
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this record?')) return;
    await api.deleteSalesVisit(id);
    load();
  };

  const handleAccountChange = (accountId: string) => {
    // Find and populate company name from selected account
    const selectedAccount = accounts.find((a) => a.id === accountId);
    setForm({
      ...form,
      accountId,
      companyName: selectedAccount?.name || ''
    });

    // Load ALL visits history for this account (including current one being edited)
    // This allows followups to accumulate in the history
    if (accountId) {
      const history = rows
        .filter((v) => v.accountId === accountId)
        .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
      setVisitHistory(history);
    } else {
      setVisitHistory([]);
    }
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
                <TableCell>Visit Date</TableCell>
                <TableCell>Followup Date</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Creator</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const followupDate = r.followupDate ? new Date(r.followupDate) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = followupDate && followupDate < today && !r.followupCompleted;

                return (
                  <TableRow key={r.id} sx={{ backgroundColor: isOverdue ? '#ffebee' : 'inherit' }}>
                    <TableCell>{r.companyName || r.account?.name || '-'}</TableCell>
                    <TableCell>{r.visitType}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'pre-wrap' }}>{r.discussion}</TableCell>
                    <TableCell>{r.visitDate ? new Date(r.visitDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell sx={{ color: isOverdue ? '#d32f2f' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                      {r.followupDate ? `${new Date(r.followupDate).toLocaleDateString()}${r.followupCompleted ? ' ✓' : ''}` : '-'}
                    </TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : '-'}</TableCell>
                    <TableCell>
                      {canUpdate && <Button size="small" onClick={() => openEdit(r)}>Edit</Button>}
                      {canDelete && <Button size="small" color="error" onClick={() => remove(r.id)}>Delete</Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">No sales visits logged yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingId ? 'Edit Visit / Call' : 'Log Visit / Call'}</DialogTitle>
          <DialogContent sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Company"
                value={form.accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
              >
                <MenuItem value="">-- Select company --</MenuItem>
                {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>

              <TextField select label="Type" value={form.visitType} onChange={(e) => setForm({ ...form, visitType: e.target.value })}>
                <MenuItem value="Visit">Visit</MenuItem>
                <MenuItem value="Call">Call</MenuItem>
              </TextField>
              <TextField label="What Was Discussed" required multiline rows={3} value={form.discussion} onChange={(e) => setForm({ ...form, discussion: e.target.value })} />
              <TextField label="Date of Visit / Call" type="date" InputLabelProps={{ shrink: true }} value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} />

              <Box sx={{ pt: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Followup</Typography>
                <TextField
                  fullWidth
                  label="Followup Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.followupDate}
                  onChange={(e) => setForm({ ...form, followupDate: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Followup Notes"
                  multiline
                  rows={2}
                  value={form.followupNotes}
                  onChange={(e) => setForm({ ...form, followupNotes: e.target.value })}
                  sx={{ mb: 2 }}
                  placeholder="What to follow up on..."
                />
              </Box>

              {visitHistory.length > 0 && (
                <Box sx={{ pt: 2, borderTop: '1px solid #eee' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>History (Non-Editable Log)</Typography>
                  <Stack spacing={2}>
                    {visitHistory.map((visit) => (
                      <Card key={visit.id} sx={{ bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                        <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Box>
                              <Chip
                                label={visit.visitType || 'Visit'}
                                size="small"
                                color={visit.visitType === 'Call' ? 'primary' : 'secondary'}
                                variant="outlined"
                                sx={{ mr: 1 }}
                              />
                              <Typography variant="caption" color="textSecondary">
                                {new Date(visit.visitDate).toLocaleDateString()}
                              </Typography>
                            </Box>
                            {visit.createdBy && (
                              <Typography variant="caption" color="textSecondary">
                                by {visit.createdBy.firstName} {visit.createdBy.lastName}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>
                            {visit.discussion}
                          </Typography>
                          {visit.followupDate && (
                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #ddd' }}>
                              <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                                Followup: {new Date(visit.followupDate).toLocaleDateString()} {visit.followupCompleted && '✓'}
                              </Typography>
                              {visit.followupNotes && (
                                <Typography variant="caption" display="block" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                                  {visit.followupNotes}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
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
