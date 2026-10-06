import React from 'react';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, LinearProgress, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead,
  TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency } from '@utils/format';
import useAuth from '@hooks/useAuth';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const METRICS: { key: string; label: string }[] = [
  { key: 'won_value', label: 'Won revenue' },
  { key: 'opportunity_value', label: 'New opportunity value' },
];

interface Draft { number: string; text: string }

// A staff member's own page: daily KPI answers, monthly projections, and the audit trail of both.
export default function MyKpisPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('kpis', 'create');
  const canEdit = hasPermission('kpis', 'update');
  const canDelete = hasPermission('kpis', 'delete');
  const [tab, setTab] = React.useState(0);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Box>
          <Typography variant="h4">My KPIs</Typography>
          <Typography variant="body2" color="text.secondary">Report your daily figures, project your month, and see every change recorded.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button component={RouterLink} to="/meeting-report" variant="outlined">Meeting report</Button>
          {hasPermission('sales_visits', 'read') && <Button component={RouterLink} to="/sales-visits" variant="outlined">Sales Report</Button>}
          {hasPermission('kpi_setup', 'read') && <Button component={RouterLink} to="/kpi-config" variant="outlined">KPI setup</Button>}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Daily KPIs" /><Tab label="Monthly projection" /><Tab label="Audit trail" />
      </Tabs>

      {tab === 0 && <DailyTab userId={user?.id} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} setError={setError} setSuccess={setSuccess} />}
      {tab === 1 && <ProjectionTab userId={user?.id} canCreate={canCreate} canEdit={canEdit} setError={setError} setSuccess={setSuccess} />}
      {tab === 2 && <AuditTab userId={user?.id} setError={setError} />}
    </Layout>
  );
}

type Msg = (m: string) => void;

function DailyTab({ userId, canCreate, canEdit, canDelete, setError, setSuccess }: { userId?: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; setError: Msg; setSuccess: Msg }) {
  const today = iso(new Date());
  const [defs, setDefs] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any[]>([]);
  const [date, setDate] = React.useState(today);
  const [prospect, setProspect] = React.useState<any>(null);
  const [options, setOptions] = React.useState<any[]>([]);
  const [prospectQuery, setProspectQuery] = React.useState('');
  const [prospectLoading, setProspectLoading] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [limit, setLimit] = React.useState(25);
  const [from, setFrom] = React.useState(() => iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = React.useState(today);
  const [edit, setEdit] = React.useState<{ entry: any; number: string; text: string; date: string } | null>(null);
  const [editError, setEditError] = React.useState('');

  const loadDefs = React.useCallback(async () => {
    try {
      const [d, s] = await Promise.all([api.getKpiDefinitions(), api.getKpiSummary({ from, to, userId })]);
      setDefs((d.data.data || []).filter((x: any) => x.isActive && x.userId === userId));
      setSummary((s.data.data?.rows || []).filter((r: any) => r.userId === userId));
    } catch (e) { setError(errMsg(e, 'Failed to load your KPIs')); } finally { setLoading(false); }
  }, [from, to, userId, setError]);

  const loadHistory = React.useCallback(async () => {
    try {
      const r = await api.getKpiEntries({ from, to, page: page + 1, limit, userId });
      setRows(r.data.data || []);
      setTotal(r.data.meta?.total ?? 0);
    } catch (e) { setError(errMsg(e, 'Failed to load your entries')); }
  }, [from, to, page, limit, userId, setError]);

  React.useEffect(() => { loadDefs(); }, [loadDefs]);
  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  // Prospect search is server-side so it works with thousands of accounts.
  React.useEffect(() => {
    let live = true;
    setProspectLoading(true);
    const t = setTimeout(() => {
      api.getAccounts(1, 20, prospectQuery ? { search: prospectQuery } : {})
        .then((r) => { if (live) setOptions(r.data.data || []); })
        .catch((e) => { if (live) setError(errMsg(e, 'Could not search prospects')); })
        .finally(() => { if (live) setProspectLoading(false); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [prospectQuery, setError]);

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? { number: '', text: '' }), ...patch } }));

  const answered = defs.filter((d) => {
    const v = drafts[d.id];
    return v && (d.type === 'text' ? v.text.trim() !== '' : v.number !== '');
  });

  const submit = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    const failed: string[] = [];
    const done: string[] = [];
    for (const d of answered) {
      const v = drafts[d.id];
      try {
        await api.createKpiEntry({ kpiId: d.id, entryDate: date, accountId: prospect?.id || null, numberValue: d.type === 'text' ? undefined : Number(v.number), textValue: v.text || undefined });
        done.push(d.id);
      } catch (e) { failed.push(`${d.name}: ${errMsg(e, 'failed')}`); }
    }
    // Clear only what was saved so a failed answer is not lost.
    setDrafts((cur) => { const n = { ...cur }; done.forEach((id) => delete n[id]); return n; });
    if (failed.length) setError(failed.join(' · '));
    if (done.length) setSuccess(`Saved ${done.length} answer${done.length === 1 ? '' : 's'} for ${date}.`);
    setSaving(false);
    await Promise.all([loadDefs(), loadHistory()]);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this entry? The deletion is recorded in the audit trail.')) return;
    try { await api.deleteKpiEntry(id); await Promise.all([loadDefs(), loadHistory()]); } catch (e) { setError(errMsg(e, 'Could not delete the entry')); }
  };

  const saveEdit = async () => {
    if (!edit) return;
    setEditError('');
    const t = edit.entry.kpi?.type;
    try {
      await api.updateKpiEntry(edit.entry.id, { entryDate: edit.date, ...(t === 'text' ? { textValue: edit.text } : { numberValue: Number(edit.number), textValue: edit.text }) });
      setEdit(null);
      setSuccess('Entry updated. The change is recorded in the audit trail.');
      await Promise.all([loadDefs(), loadHistory()]);
    } catch (e) { setEditError(errMsg(e, 'Could not update the entry')); }
  };

  const display = (e: any) => {
    if (e.kpi?.type === 'yes_no') return Number(e.numberValue) === 1 ? 'Yes' : 'No';
    if (e.kpi?.type === 'text') return e.textValue;
    return `${Number(e.numberValue)}${e.kpi?.unit ? ` ${e.kpi.unit}` : ''}`;
  };

  return (
    <>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {!loading && defs.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No KPIs have been assigned to you yet. Ask an administrator to set them up.</Alert>}

      {defs.length > 0 && canCreate && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Add entries</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} inputProps={{ max: today }} />
              <Autocomplete
                size="small" sx={{ minWidth: 280, flex: 1 }} options={options} loading={prospectLoading} value={prospect}
                getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(a, b) => a.id === b.id} filterOptions={(x) => x}
                onChange={(_, v) => setProspect(v)}
                onInputChange={(_, v, reason) => { if (reason === 'input') setProspectQuery(v); }}
                noOptionsText={prospectLoading ? 'Searching…' : 'No prospects found'}
                renderInput={(p) => <TextField {...p} label="Prospect (optional)" />}
              />
            </Stack>
            <Stack spacing={2}>
              {defs.map((d) => (
                <Paper key={d.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={600}>{d.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.frequency}{d.targetValue !== null ? ` · target ${Number(d.targetValue)}${d.unit ? ` ${d.unit}` : ''}` : ''}{d.description ? ` · ${d.description}` : ''}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {d.type === 'number' && <TextField size="small" type="number" label={d.unit || 'Value'} value={drafts[d.id]?.number ?? ''} onChange={(e) => setDraft(d.id, { number: e.target.value })} />}
                    {d.type === 'yes_no' && (
                      <TextField size="small" select sx={{ minWidth: 120 }} label="Answer" value={drafts[d.id]?.number ?? ''} onChange={(e) => setDraft(d.id, { number: e.target.value })}>
                        <MenuItem value="">-</MenuItem><MenuItem value="1">Yes</MenuItem><MenuItem value="0">No</MenuItem>
                      </TextField>
                    )}
                    {d.type === 'text' && <TextField size="small" fullWidth multiline minRows={2} label="Answer" value={drafts[d.id]?.text ?? ''} onChange={(e) => setDraft(d.id, { text: e.target.value })} />}
                  </Box>
                </Paper>
              ))}
            </Stack>
            <Button variant="contained" sx={{ mt: 2 }} onClick={submit} disabled={saving || answered.length === 0}>
              {saving ? 'Saving…' : `Save ${answered.length || ''} answer${answered.length === 1 ? '' : 's'}`}
            </Button>
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
      </Stack>

      {summary.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>How you're tracking ({from} → {to})</Typography>
            <Stack spacing={1.5}>
              {summary.map((r) => (
                <Box key={r.kpiId}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{r.name}</Typography>
                    <Typography variant="body2" fontWeight={600}>{r.total}{r.target !== null ? ` / ${r.target}` : ''}{r.unit ? ` ${r.unit}` : ''}</Typography>
                  </Box>
                  {r.pctOfTarget !== null && <LinearProgress variant="determinate" value={Math.min(100, r.pctOfTarget)} color={r.pctOfTarget >= 100 ? 'success' : r.pctOfTarget >= 60 ? 'warning' : 'error'} sx={{ height: 8, borderRadius: 1 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>My entries ({total})</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Date</TableCell><TableCell>KPI</TableCell><TableCell>Answer</TableCell><TableCell>Prospect</TableCell><TableCell align="right" /></TableRow></TableHead>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{String(e.entryDate).slice(0, 10)}</TableCell>
                    <TableCell>{e.kpi?.name}</TableCell>
                    <TableCell>{display(e)}{e.kpi?.type !== 'text' && e.textValue ? <Typography variant="caption" color="text.secondary" display="block">{e.textValue}</Typography> : null}</TableCell>
                    <TableCell>{e.accountName || '-'}</TableCell>
                    <TableCell align="right">
                      {canEdit && <Tooltip title="Edit"><IconButton size="small" aria-label="Edit entry" onClick={() => { setEditError(''); setEdit({ entry: e, number: e.numberValue === null ? '' : String(Number(e.numberValue)), text: e.textValue || '', date: String(e.entryDate).slice(0, 10) }); }}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                      {canDelete && <Tooltip title="Delete"><IconButton size="small" aria-label="Delete entry" onClick={() => remove(e.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={5} align="center">No entries in this date range</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
          <TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }} />
        </CardContent>
      </Card>

      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit entry</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          {edit && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">{edit.entry.kpi?.name}</Typography>
              <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={edit.date} inputProps={{ max: today }} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
              {edit.entry.kpi?.type === 'number' && <TextField type="number" label={edit.entry.kpi?.unit || 'Value'} value={edit.number} onChange={(e) => setEdit({ ...edit, number: e.target.value })} />}
              {edit.entry.kpi?.type === 'yes_no' && (
                <TextField select label="Answer" value={edit.number} onChange={(e) => setEdit({ ...edit, number: e.target.value })}><MenuItem value="1">Yes</MenuItem><MenuItem value="0">No</MenuItem></TextField>
              )}
              {edit.entry.kpi?.type === 'text' && <TextField multiline minRows={3} label="Answer" value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />}
              <Alert severity="info" icon={false}>The old and new values are both kept in the audit trail.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="contained" onClick={saveEdit}>Save</Button></DialogActions>
      </Dialog>
    </>
  );
}

function ProjectionTab({ userId, canCreate, canEdit, setError, setSuccess }: { userId?: string; canCreate: boolean; canEdit: boolean; setError: Msg; setSuccess: Msg }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [cells, setCells] = React.useState<Record<string, { amount: string; note: string }>>({});
  const [saving, setSaving] = React.useState('');
  const thisMonth = iso(new Date()).slice(0, 7);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getProjections();
      setData(r.data.data);
      setCells({});
    } catch (e) { setError(errMsg(e, 'Failed to load projections')); } finally { setLoading(false); }
  }, [setError]);
  React.useEffect(() => { load(); }, [load]);

  const find = (month: string, metric: string) => data?.rows?.find((p: any) => p.month.slice(0, 7) === month.slice(0, 7) && p.metric === metric);

  const save = async (month: string, metric: string) => {
    const k = `${month}|${metric}`;
    const cur = cells[k];
    const existing = find(month, metric);
    const amount = cur?.amount ?? (existing ? String(existing.projected) : '');
    const note = cur?.note ?? existing?.note ?? '';
    setSaving(k);
    setError('');
    try {
      await api.saveProjection({ month: month.slice(0, 7), metric, amount: amount === '' ? '' : Number(amount), note });
      setSuccess(`Projection for ${month.slice(0, 7)} saved. The revision is recorded in the audit trail.`);
      await load();
    } catch (e) { setError(errMsg(e, 'Could not save the projection')); } finally { setSaving(''); }
  };

  if (loading && !data) return <LinearProgress />;
  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Enter the figure you expect to deliver each month. You can revise the current and future months as things change — every revision is kept. A month locks when it ends.
        “Actual so far” comes from your opportunities.
      </Alert>
      <Grid container spacing={2}>
        {(data?.months || []).map((m: string) => {
          const past = m.slice(0, 7) < thisMonth;
          return (
            <Grid item xs={12} md={6} key={m}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{new Date(`${m}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}{m.slice(0, 7) === thisMonth && <Chip size="small" color="primary" label="This month" sx={{ ml: 1 }} />}{past && <Chip size="small" label="Locked" sx={{ ml: 1 }} />}</Typography>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    {METRICS.map(({ key, label }) => {
                      const ex = find(m, key);
                      const k = `${m}|${key}`;
                      const val = cells[k]?.amount ?? (ex ? String(ex.projected) : '');
                      const note = cells[k]?.note ?? ex?.note ?? '';
                      const dirty = cells[k] !== undefined;
                      return (
                        <Paper key={key} variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="body2" fontWeight={600}>{label}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap" useFlexGap>
                            <TextField size="small" type="number" label="Projected ($)" sx={{ width: 160 }} disabled={past || (ex ? !canEdit : !canCreate)} value={val} onChange={(e) => setCells({ ...cells, [k]: { amount: e.target.value, note } })} inputProps={{ min: 0 }} />
                            <TextField size="small" label="Note" sx={{ flex: 1, minWidth: 140 }} disabled={past || (ex ? !canEdit : !canCreate)} value={note} onChange={(e) => setCells({ ...cells, [k]: { amount: val, note: e.target.value } })} />
                            {!past && <Button size="small" variant="contained" disabled={!dirty || val === '' || saving === k} onClick={() => save(m, key)}>{saving === k ? 'Saving…' : 'Save'}</Button>}
                          </Stack>
                          {ex && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Actual so far {formatCurrency(ex.actual)}{ex.pct !== null ? ` · ${ex.pct}% of projection` : ''} · revised {Math.max(0, ex.revisions - 1)}×
                              </Typography>
                              {ex.pct !== null && <LinearProgress variant="determinate" value={Math.min(100, ex.pct)} color={ex.pct >= 100 ? 'success' : 'primary'} sx={{ height: 6, borderRadius: 1, mt: 0.5 }} />}
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}

const ACTION_COLOR: Record<string, 'success' | 'info' | 'error'> = { created: 'success', updated: 'info', deleted: 'error' };

// Compact before → after description of a trail row.
export function describeChange(row: any): string {
  const b = row.before || {}, a = row.after || {};
  const label = (o: any) => [o.kpi, o.metric && String(o.metric).replace('_', ' '), o.month, o.entryDate].filter(Boolean).join(' · ');
  if (row.action === 'created') return `${label(a)} — ${valueText(a)}`;
  if (row.action === 'deleted') return `${label(b)} — was ${valueText(b)}`;
  const changes = Object.keys({ ...b, ...a }).filter((k) => !['kpi', 'kpiId'].includes(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => `${k}: ${fmt(b[k])} → ${fmt(a[k])}`);
  return `${label(a)} — ${changes.join('; ')}`;
}
const fmt = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));
const valueText = (o: any) => [o.amount !== undefined ? `$${Number(o.amount)}` : o.numberValue !== null && o.numberValue !== undefined ? o.numberValue : null, o.textValue || o.note].filter((x) => x !== null && x !== undefined && x !== '').join(' · ') || '—';

function AuditTab({ userId, setError }: { userId?: string; setError: Msg }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [limit, setLimit] = React.useState(25);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    setLoading(true);
    api.getKpiAudit({ page: page + 1, limit, userId })
      .then((r) => { setRows(r.data.data || []); setTotal(r.data.meta?.total ?? 0); })
      .catch((e) => setError(errMsg(e, 'Failed to load the audit trail')))
      .finally(() => setLoading(false));
  }, [page, limit, userId, setError]);
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Audit trail ({total})</Typography>
        {loading && <LinearProgress />}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>When</TableCell><TableCell>Action</TableCell><TableCell>Changed by</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell><Chip size="small" color={ACTION_COLOR[r.action]} label={`${r.entityType === 'projection' ? 'Projection' : 'KPI entry'} ${r.action}`} /></TableCell>
                  <TableCell>{r.actorName || 'Unknown'}</TableCell>
                  <TableCell>{describeChange(r)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !loading && <TableRow><TableCell colSpan={4} align="center">Nothing recorded yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
        <TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }} />
      </CardContent>
    </Card>
  );
}
