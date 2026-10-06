import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import { api } from '@services/api';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const blank = { name: '', description: '', type: 'number', unit: '', userId: '', frequency: 'weekly', targetValue: '', isActive: true };
const TYPE_LABEL: Record<string, string> = { number: 'Number', yes_no: 'Yes / No', text: 'Text answer' };

// Admin: define the questions/figures each staff member reports on, and see how everyone is tracking.
export default function KpiConfigPage() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [defs, setDefs] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any[]>([]);
  const [staff, setStaff] = React.useState('');
  const [from, setFrom] = React.useState(() => iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = React.useState(() => iso(new Date()));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [dialog, setDialog] = React.useState<{ id?: string; form: typeof blank } | null>(null);
  const [dialogError, setDialogError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const userName = React.useMemo(() => new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`])), [users]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, s] = await Promise.all([
        api.getKpiDefinitions(staff ? { userId: staff } : undefined),
        api.getKpiSummary({ from, to }),
      ]);
      setDefs(d.data.data || []);
      setSummary((s.data.data?.rows || []).filter((r: any) => !staff || r.userId === staff));
    } catch (e) {
      setError(errMsg(e, 'Failed to load KPIs'));
    } finally {
      setLoading(false);
    }
  }, [staff, from, to]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    api.getUsers(1, 500).then((r) => setUsers(r.data.data || [])).catch((e) => setError(errMsg(e, 'Could not load staff list')));
  }, []);

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    setDialogError('');
    try {
      const f = dialog.form;
      const payload = { ...f, unit: f.unit || null, description: f.description || null, targetValue: f.targetValue === '' ? null : Number(f.targetValue) };
      if (dialog.id) await api.updateKpiDefinition(dialog.id, payload);
      else await api.createKpiDefinition(payload);
      setDialog(null);
      await load();
    } catch (e) {
      setDialogError(errMsg(e, 'Could not save the KPI'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: any) => {
    if (!window.confirm(`Delete "${d.name}"? All answers staff have recorded for it are deleted too.`)) return;
    try { await api.deleteKpiDefinition(d.id); await load(); } catch (e) { setError(errMsg(e, 'Could not delete the KPI')); }
  };

  const toggleActive = async (d: any) => {
    try { await api.updateKpiDefinition(d.id, { isActive: !d.isActive }); await load(); } catch (e) { setError(errMsg(e, 'Could not update the KPI')); }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4">Staff KPI Setup</Typography>
          <Typography variant="body2" color="text.secondary">
            Define the questions and figures each salesperson reports on. Staff answer them date-wise from “My KPIs”, against a prospect.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => { setDialogError(''); setDialog({ form: { ...blank, userId: staff } }); }}>Add KPI</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField size="small" select label="Staff" sx={{ minWidth: 200 }} value={staff} onChange={(e) => setStaff(e.target.value)}>
          <MenuItem value="">All staff</MenuItem>
          {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="Tracking from" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField size="small" type="date" label="to" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
      </Stack>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Tracking</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell><TableCell>KPI</TableCell>
                  <TableCell align="right">Reported</TableCell><TableCell align="right">Target for range</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>% of target</TableCell><TableCell>Last entry</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map((r) => (
                  <TableRow key={r.kpiId}>
                    <TableCell>{r.userName}</TableCell>
                    <TableCell>{r.name}<Typography variant="caption" color="text.secondary" display="block">{r.frequency}</Typography></TableCell>
                    <TableCell align="right">{r.total}{r.unit ? ` ${r.unit}` : ''}</TableCell>
                    <TableCell align="right">{r.target === null ? '-' : `${r.target}${r.unit ? ` ${r.unit}` : ''}`}</TableCell>
                    <TableCell>
                      {r.pctOfTarget === null ? '-' : (
                        <Box>
                          <Typography variant="caption">{r.pctOfTarget}%</Typography>
                          <LinearProgress variant="determinate" value={Math.min(100, r.pctOfTarget)} color={r.pctOfTarget >= 100 ? 'success' : r.pctOfTarget >= 60 ? 'warning' : 'error'} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{r.lastEntry || <Typography variant="body2" color="error">Never</Typography>}</TableCell>
                  </TableRow>
                ))}
                {summary.length === 0 && <TableRow><TableCell colSpan={6} align="center">{loading ? 'Loading…' : 'No active KPIs for this selection'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>KPI definitions ({defs.length})</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Question / figure</TableCell><TableCell>Staff</TableCell><TableCell>Type</TableCell>
                  <TableCell>How often</TableCell><TableCell align="right">Target</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {defs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}{d.description && <Typography variant="caption" color="text.secondary" display="block">{d.description}</Typography>}</TableCell>
                    <TableCell>{userName.get(d.userId) || '-'}</TableCell>
                    <TableCell>{TYPE_LABEL[d.type]}{d.unit ? ` (${d.unit})` : ''}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{d.frequency}</TableCell>
                    <TableCell align="right">{d.targetValue === null ? '-' : Number(d.targetValue)}</TableCell>
                    <TableCell><Chip size="small" clickable color={d.isActive ? 'success' : 'default'} label={d.isActive ? 'Active' : 'Paused'} onClick={() => toggleActive(d)} /></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" aria-label="Edit KPI" onClick={() => { setDialogError(''); setDialog({ id: d.id, form: { name: d.name, description: d.description || '', type: d.type, unit: d.unit || '', userId: d.userId, frequency: d.frequency, targetValue: d.targetValue === null ? '' : String(Number(d.targetValue)), isActive: d.isActive } }); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" aria-label="Delete KPI" onClick={() => remove(d)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {defs.length === 0 && <TableRow><TableCell colSpan={7} align="center">{loading ? 'Loading…' : 'No KPIs configured yet. Use “Add KPI”.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.id ? 'Edit KPI' : 'Add KPI'}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {dialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField required label="Question / figure" placeholder="e.g. How many prospect calls did you make?" value={dialog.form.name} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })} />
              <TextField label="Guidance (optional)" multiline minRows={2} value={dialog.form.description} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })} />
              <TextField required select label="Staff member" value={dialog.form.userId} disabled={!!dialog.id} helperText={dialog.id ? 'Create a new KPI to assign it to someone else' : undefined} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, userId: e.target.value } })}>
                {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth select label="Answer type" value={dialog.form.type} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, type: e.target.value } })}>
                  <MenuItem value="number">Number (calls, meetings, $…)</MenuItem>
                  <MenuItem value="yes_no">Yes / No</MenuItem>
                  <MenuItem value="text">Text answer</MenuItem>
                </TextField>
                <TextField fullWidth select label="How often" value={dialog.form.frequency} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, frequency: e.target.value } })}>
                  <MenuItem value="daily">Daily</MenuItem><MenuItem value="weekly">Weekly</MenuItem><MenuItem value="monthly">Monthly</MenuItem>
                </TextField>
              </Stack>
              {dialog.form.type !== 'text' && (
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth type="number" label={`Target per ${dialog.form.frequency.replace('ly', '').replace('dai', 'day')}`} helperText={dialog.form.type === 'yes_no' ? 'Number of “yes” answers expected' : undefined} value={dialog.form.targetValue} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, targetValue: e.target.value } })} inputProps={{ min: 0 }} />
                  {dialog.form.type === 'number' && <TextField fullWidth label="Unit (optional)" placeholder="calls, $, visits" value={dialog.form.unit} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, unit: e.target.value } })} />}
                </Stack>
              )}
              <FormControlLabel control={<Checkbox checked={dialog.form.isActive} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, isActive: e.target.checked } })} />} label="Active (shown to staff)" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !dialog?.form.name || !dialog?.form.userId}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
