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
  // Full record of the visit being edited (holds accumulating followups)
  const [editingVisit, setEditingVisit] = useState<any>(null);

  const load = async () => {
    const params: any = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const res = await api.getSalesVisits(params);
    const data = res.data.data || [];
    setRows(data);
    return data;
  };
  useEffect(() => {
    load();
    api.getAccounts(1, 200).then((r) => setAccounts(r.data.data || [])).catch(() => {});
    /* eslint-disable-next-line */
  }, []);

  const openNew = () => {
    setEditingId(null);
    setEditingVisit(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEditingId(r.id);
    setEditingVisit(r);

    // Load company name from account if not stored
    const companyName = r.companyName || accounts.find((a) => a.id === r.accountId)?.name || '';

    setForm({
      accountId: r.accountId || '',
      companyName,
      visitType: r.visitType || 'Visit',
      discussion: r.discussion || '',
      visitDate: r.visitDate ? new Date(r.visitDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      // Followup inputs start empty on edit — the user adds a NEW followup each time
      followupDate: '',
      followupCompleted: false,
      followupNotes: '',
    });
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
        // Edit mode: only a followup is being added. Require a followup message.
        if (!payload.followupNotes || !payload.followupNotes.trim()) {
          alert('Please enter a followup message to add to the history.');
          return;
        }
        await api.updateSalesVisit(editingId, payload);

        // Reload and re-open the SAME visit so the new followup shows in history
        const data = await load();
        const refreshed = data.find((v: any) => v.id === editingId);
        if (refreshed) {
          setEditingVisit(refreshed);
          // Clear the followup inputs so the user can add another one
          setForm((prev: any) => ({ ...prev, followupDate: '', followupCompleted: false, followupNotes: '' }));
        }
        // Keep dialog OPEN so more followups can be added
      } else {
        // Create mode: new visit
        await api.createSalesVisit(payload);
        await load();
        setOpen(false);
        setForm(empty);
        setEditingId(null);
        setEditingVisit(null);
      }
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
              {/* Main fields — locked (read-only) when editing an existing visit */}
              <TextField
                select
                label="Company"
                value={form.accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                disabled={!!editingId}
              >
                <MenuItem value="">-- Select company --</MenuItem>
                {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>

              <TextField
                select
                label="Type"
                value={form.visitType}
                onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                disabled={!!editingId}
              >
                <MenuItem value="Visit">Visit</MenuItem>
                <MenuItem value="Call">Call</MenuItem>
              </TextField>
              <TextField
                label="What Was Discussed"
                required
                multiline
                rows={3}
                value={form.discussion}
                onChange={(e) => setForm({ ...form, discussion: e.target.value })}
                disabled={!!editingId}
              />
              <TextField
                label="Date of Visit / Call"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.visitDate}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                disabled={!!editingId}
              />

              <Box sx={{ pt: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  {editingId ? 'Add Followup Message' : 'Followup'}
                </Typography>
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.followupCompleted}
                      onChange={(e) => setForm({ ...form, followupCompleted: e.target.checked })}
                    />
                  }
                  label="Mark followup as completed"
                />
              </Box>

              {/* History log of the current visit + all its accumulating followups */}
              {editingId && editingVisit && (
                <Box sx={{ pt: 2, borderTop: '1px solid #eee' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>History (Non-Editable Log)</Typography>
                  <Stack spacing={2}>
                    {/* Original visit entry */}
                    <Card sx={{ bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                      <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box>
                            <Chip
                              label={editingVisit.visitType || 'Visit'}
                              size="small"
                              color={editingVisit.visitType === 'Call' ? 'primary' : 'secondary'}
                              variant="outlined"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="caption" color="textSecondary">
                              {editingVisit.visitDate ? new Date(editingVisit.visitDate).toLocaleDateString() : ''}
                            </Typography>
                          </Box>
                          {editingVisit.createdBy && (
                            <Typography variant="caption" color="textSecondary">
                              by {editingVisit.createdBy.firstName} {editingVisit.createdBy.lastName}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>
                          {editingVisit.discussion}
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* Accumulating followup entries (newest first) */}
                    {(editingVisit.followups || [])
                      .slice()
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((fu: any) => (
                        <Card key={fu.id} sx={{ bgcolor: '#eef6ff', border: '1px solid #bbdefb', ml: 2 }}>
                          <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Chip
                                label={`Followup${fu.followupDate ? ' · ' + new Date(fu.followupDate).toLocaleDateString() : ''}${fu.completed ? ' ✓' : ''}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              <Typography variant="caption" color="textSecondary">
                                {fu.createdBy ? `by ${fu.createdBy.firstName} ${fu.createdBy.lastName} · ` : ''}
                                {fu.createdAt ? new Date(fu.createdAt).toLocaleString() : ''}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {fu.notes}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}

                    {(!editingVisit.followups || editingVisit.followups.length === 0) && (
                      <Typography variant="caption" color="textSecondary">
                        No followups yet. Add a followup message above and click Save.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{editingId ? 'Close' : 'Cancel'}</Button>
            <Button
              variant="contained"
              onClick={save}
              disabled={editingId ? !form.followupNotes?.trim() : !form.discussion}
            >
              {editingId ? 'Add Followup' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default SalesVisitsPage;
