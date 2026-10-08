import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import Layout from '@components/Layout';
import { api } from '@services/api';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const blank = { masterId: '', userId: '', frequency: 'daily', targetValue: '', isActive: true, startDate: '' };
const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const fmtStamp = (v: any) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const TYPE_LABEL: Record<string, string> = { number: 'Number', yes_no: 'Yes / No', text: 'Text answer', choice: 'Choice (pick from a list)' };

// Admin: define the questions/figures each staff member reports on, and see how everyone is tracking.
export default function KpiConfigPage() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [defs, setDefs] = React.useState<any[]>([]);
  const [master, setMaster] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any[]>([]);
  const [staff, setStaff] = React.useState('');
  const [from, setFrom] = React.useState(() => iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = React.useState(() => iso(new Date()));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [dialog, setDialog] = React.useState<{ id?: string; form: typeof blank } | null>(null);
  const [dialogError, setDialogError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [copy, setCopy] = React.useState<{ from: string; to: string[] } | null>(null);
  const [copyError, setCopyError] = React.useState('');
  const [notice, setNotice] = React.useState('');

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
    api.getKpiMaster().then((r) => setMaster(r.data.data || [])).catch((e) => setError(errMsg(e, 'Could not load the KPI master')));
  }, []);
  React.useEffect(() => {
    api.getUsers(1, 500).then((r) => setUsers(r.data.data || [])).catch((e) => setError(errMsg(e, 'Could not load staff list')));
  }, []);

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    setDialogError('');
    try {
      const f = dialog.form;
      const payload = { masterId: f.masterId, userId: f.userId, frequency: f.frequency, targetValue: f.targetValue === '' ? null : Number(f.targetValue), isActive: f.isActive, startDate: f.startDate || today() };
      if (dialog.id) await api.updateKpiDefinition(dialog.id, { frequency: payload.frequency, targetValue: payload.targetValue, isActive: payload.isActive, startDate: payload.startDate });
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

  const doCopy = async () => {
    if (!copy) return;
    setSaving(true);
    setCopyError('');
    try {
      const r = await api.copyKpiDefinitions({ fromUserId: copy.from, toUserIds: copy.to });
      setCopy(null);
      setNotice(`Copied to ${r.data.data.staff} staff: ${r.data.data.created} KPIs added, ${r.data.data.skipped} skipped (already had them).`);
      await load();
    } catch (e) {
      setCopyError(errMsg(e, 'Could not copy the KPIs'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (d: any) => {
    setDialogError('');
    setDialog({ id: d.id, form: { startDate: String(d.startDate || '').slice(0, 10), masterId: d.masterId || '', userId: d.userId, frequency: d.frequency, targetValue: d.targetValue === null ? '' : String(Number(d.targetValue)), isActive: d.isActive } });
  };
  const defById = React.useMemo(() => new Map(defs.map((d) => [d.id, d])), [defs]);

  const toggleActive = async (d: any) => {
    try { await api.updateKpiDefinition(d.id, { isActive: !d.isActive }); await load(); } catch (e) { setError(errMsg(e, 'Could not update the KPI')); }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4">Staff KPI Setup</Typography>
          <Typography variant="body2" color="text.secondary">
            Assign questions from the KPI Master to each salesperson. Staff answer them date-wise from “My KPIs”, against a prospect.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button component={RouterLink} to="/kpi-master" variant="outlined">KPI Master</Button>
          <Button variant="outlined" onClick={() => { setCopyError(''); setCopy({ from: staff, to: [] }); }}>Copy to other staff</Button>
          <Button variant="contained" onClick={() => { setDialogError(''); setDialog({ form: { ...blank, userId: staff, startDate: today() } }); }}>Add KPI</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Use the pencil to edit a KPI or the bin to delete it. Filter by staff to see one person's set.</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Actions</TableCell><TableCell>Staff</TableCell><TableCell>KPI</TableCell>
                  <TableCell align="right">Reported</TableCell><TableCell align="right">Target for range</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>% of target</TableCell><TableCell>Last entry</TableCell><TableCell>Start date</TableCell><TableCell>Created</TableCell><TableCell>Last edited</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map((r) => (
                  <TableRow key={r.kpiId}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {defById.get(r.kpiId) && (
                        <>
                          <Tooltip title="Edit"><IconButton size="small" aria-label="Edit KPI" onClick={() => openEdit(defById.get(r.kpiId))}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton size="small" aria-label="Delete KPI" onClick={() => remove(defById.get(r.kpiId))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </>
                      )}
                    </TableCell>
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
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.lastEntry || <Typography variant="body2" color="error">Never</Typography>}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(`${String(r.startDate).slice(0, 10)}T00:00:00`)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtStamp(defById.get(r.kpiId)?.createdAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtStamp(defById.get(r.kpiId)?.updatedAt)}</TableCell>
                  </TableRow>
                ))}
                {summary.length === 0 && <TableRow><TableCell colSpan={10} align="center">{loading ? 'Loading…' : 'No active KPIs for this selection'}</TableCell></TableRow>}
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
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Actions</TableCell><TableCell>Question / figure</TableCell><TableCell>Staff</TableCell><TableCell>Type</TableCell>
                  <TableCell>How often</TableCell><TableCell align="right">Target</TableCell><TableCell>Status</TableCell><TableCell>Start date</TableCell><TableCell>Created</TableCell><TableCell>Last edited</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {defs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Edit"><IconButton size="small" aria-label="Edit KPI" onClick={() => openEdit(d)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" aria-label="Delete KPI" onClick={() => remove(d)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                    <TableCell>{d.name}{d.description && <Typography variant="caption" color="text.secondary" display="block">{d.description}</Typography>}</TableCell>
                    <TableCell>{userName.get(d.userId) || '-'}</TableCell>
                    <TableCell>{TYPE_LABEL[d.type]}{d.unit ? ` (${d.unit})` : ''}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{d.frequency}</TableCell>
                    <TableCell align="right">{d.targetValue === null ? '-' : Number(d.targetValue)}</TableCell>
                    <TableCell><Chip size="small" clickable color={d.isActive ? 'success' : 'default'} label={d.isActive ? 'Active' : 'Paused'} onClick={() => toggleActive(d)} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(String(d.startDate).slice(0, 10) + 'T00:00:00')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtStamp(d.createdAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtStamp(d.updatedAt)}</TableCell>
                  </TableRow>
                ))}
                {defs.length === 0 && <TableRow><TableCell colSpan={10} align="center">{loading ? 'Loading…' : 'No KPIs configured yet. Use “Add KPI”.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={!!copy} onClose={() => !saving && setCopy(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Copy KPIs to other staff</DialogTitle>
        <DialogContent>
          {copyError && <Alert severity="error" sx={{ mb: 2 }}>{copyError}</Alert>}
          {copy && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Copies the active KPIs (questions, types, frequency and targets) from one person to others. KPIs a person already has, matched by name, are skipped.</Typography>
              <TextField select label="Copy from" value={copy.from} onChange={(e) => setCopy({ ...copy, from: e.target.value, to: copy.to.filter((t) => t !== e.target.value) })}>
                {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
              </TextField>
              <TextField select label="Copy to" SelectProps={{ multiple: true, renderValue: (v: any) => `${(v as string[]).length} selected` }} value={copy.to} onChange={(e) => setCopy({ ...copy, to: e.target.value as unknown as string[] })}>
                {users.filter((u) => u.id !== copy.from).map((u) => <MenuItem key={u.id} value={u.id}><Checkbox checked={copy.to.includes(u.id)} />{u.firstName} {u.lastName}</MenuItem>)}
              </TextField>
              <Button size="small" onClick={() => setCopy({ ...copy, to: users.filter((u) => u.id !== copy.from).map((u) => u.id) })}>Select all staff</Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopy(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={doCopy} disabled={saving || !copy?.from || !copy?.to.length}>{saving ? 'Copying…' : 'Copy'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.id ? 'Edit KPI' : 'Add KPI'}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {dialog && (() => {
            const picked = master.find((m) => m.id === dialog.form.masterId);
            const setForm = (patch: Partial<typeof blank>) => setDialog({ ...dialog, form: { ...dialog.form, ...patch } });
            const active = master.filter((m) => m.isActive);
            // An inactive question can still be shown when editing an existing assignment.
            const options = dialog.id && picked && !picked.isActive ? [picked, ...active] : active;
            return (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  required select label="Question (from KPI Master)" value={dialog.form.masterId} disabled={!!dialog.id}
                  helperText={dialog.id ? 'The question is managed in KPI Master' : master.length === 0 ? 'No questions yet - add them in KPI Master first' : undefined}
                  onChange={(e) => { const m = master.find((x) => x.id === e.target.value); setForm({ masterId: e.target.value, frequency: m?.defaultFrequency || 'daily', targetValue: m && m.defaultTarget !== null ? String(Number(m.defaultTarget)) : '' }); }}
                >
                  {options.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}{!m.isActive ? ' (inactive)' : ''}</MenuItem>)}
                </TextField>
                {picked && (
                  <Typography variant="body2" color="text.secondary">
                    Answer type: {TYPE_LABEL[picked.type]}{picked.unit ? ` (${picked.unit})` : ''}{picked.description ? ` · ${picked.description}` : ''}
                  </Typography>
                )}
                {picked?.type === 'choice' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Answers staff can choose from</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>{(picked.answerOptions || []).map((o: string) => <Chip key={o} size="small" label={o} />)}</Stack>
                  </Box>
                )}
                <TextField required select label="Staff member" value={dialog.form.userId} disabled={!!dialog.id} helperText={dialog.id ? 'Add the KPI again to give it to someone else' : undefined} onChange={(e) => setForm({ userId: e.target.value })}>
                  {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
                </TextField>
                <TextField required type="date" label="Start date" InputLabelProps={{ shrink: true }} value={dialog.form.startDate} onChange={(e) => setForm({ startDate: e.target.value })} helperText="Targets and missed-day counts run from this date; earlier dates cannot be reported" />
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth select label="How often" value={dialog.form.frequency} onChange={(e) => setForm({ frequency: e.target.value })}>
                    <MenuItem value="daily">Daily</MenuItem><MenuItem value="weekly">Weekly</MenuItem><MenuItem value="monthly">Monthly</MenuItem>
                  </TextField>
                  {picked?.type !== 'text' && picked?.type !== 'choice' && (
                    <TextField fullWidth type="number" label={`Target per ${dialog.form.frequency.replace('ly', '').replace('dai', 'day')}`} helperText={picked?.type === 'yes_no' ? 'Number of “yes” answers expected' : undefined} value={dialog.form.targetValue} onChange={(e) => setForm({ targetValue: e.target.value })} inputProps={{ min: 0 }} />
                  )}
                </Stack>
                <FormControlLabel control={<Checkbox checked={dialog.form.isActive} onChange={(e) => setForm({ isActive: e.target.checked })} />} label="Active (shown to staff)" />
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !dialog?.form.masterId || !dialog?.form.userId || !dialog?.form.startDate}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
