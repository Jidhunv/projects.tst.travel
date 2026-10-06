import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip as MuiTooltip, Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency, formatCurrencyCompact } from '@utils/format';
import useAuth from '@hooks/useAuth';

const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
const PACE: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  achieved: { label: 'Target met', color: 'success' },
  ahead: { label: 'Ahead of pace', color: 'success' },
  'on-pace': { label: 'On pace', color: 'info' },
  behind: { label: 'Behind pace', color: 'error' },
  'not-started': { label: 'Not started', color: 'default' },
  'ended-short': { label: 'Ended short', color: 'error' },
};
const METRIC_LABEL: Record<string, string> = { won_value: 'Won revenue', opportunity_value: 'New opportunity value' };
const blankTarget = { name: '', metric: 'won_value', ownerId: '', startDate: '', endDate: '', targetValue: '' };

export default function PerformancePage() {
  const { hasPermission } = useAuth();
  const theme = useTheme();
  const canCreateTarget = hasPermission('targets', 'create');
  const canEditTarget = hasPermission('targets', 'update');
  const canDeleteTarget = hasPermission('targets', 'delete');
  const [overview, setOverview] = React.useState<any>(null);
  const [targets, setTargets] = React.useState<any[]>([]);
  const [owners, setOwners] = React.useState<any[]>([]);
  const [ownerId, setOwnerId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [view, setView] = React.useState<'both' | 'created' | 'won'>('both');
  const [dialog, setDialog] = React.useState<{ id?: string; form: typeof blankTarget } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [dialogError, setDialogError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [o, t] = await Promise.all([
        api.getPerformanceOverview(ownerId ? { ownerId } : undefined),
        api.getTargets(),
      ]);
      setOverview(o.data.data);
      setTargets(t.data.data || []);
    } catch (e) {
      setError(errMsg(e, 'Failed to load performance data'));
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    // The owner picker only appears when the user may list staff.
    api.getUsers(1, 500).then((r) => setOwners(r.data.data || [])).catch(() => setOwners([]));
  }, []);

  const saveTarget = async () => {
    if (!dialog) return;
    setSaving(true);
    setDialogError('');
    try {
      const payload = { ...dialog.form, targetValue: Number(dialog.form.targetValue), ownerId: dialog.form.ownerId || null };
      if (dialog.id) await api.updateTarget(dialog.id, payload);
      else await api.createTarget(payload);
      setDialog(null);
      await load();
    } catch (e) {
      setDialogError(errMsg(e, 'Could not save the target'));
    } finally {
      setSaving(false);
    }
  };

  const removeTarget = async (t: any) => {
    if (!window.confirm(`Delete target "${t.name}"?`)) return;
    try { await api.deleteTarget(t.id); await load(); } catch (e) { setError(errMsg(e, 'Could not delete the target')); }
  };

  const chartData = (overview?.weekly || []).map((w: any) => ({
    week: new Date(`${w.weekStart}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    'Opportunity value created': w.createdValue,
    'Won (converted)': w.wonValue,
  }));

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4">Targets &amp; Performance</Typography>
          <Typography variant="body2" color="text.secondary">
            Opportunity value created and converted to wins, by week and period, tracked against targets.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {owners.length > 0 && (
            <TextField size="small" select label="Owner" sx={{ minWidth: 180 }} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <MenuItem value="">Whole team</MenuItem>
              {owners.map((o) => <MenuItem key={o.id} value={o.id}>{o.firstName} {o.lastName}</MenuItem>)}
            </TextField>
          )}
          {canCreateTarget && <Button variant="contained" onClick={() => { setDialogError(''); setDialog({ form: blankTarget }); }}>Set target</Button>}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !overview && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>}

      {overview && (
        <Box sx={{ opacity: loading ? 0.6 : 1 }}>
          {/* Period cards */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {overview.periods.map((p: any) => (
              <Grid item xs={12} sm={6} md={4} lg key={p.key}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">{p.label}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>Opportunity value created</Typography>
                    <Typography variant="h6" fontWeight={700}>{formatCurrencyCompact(p.createdValue)}</Typography>
                    <Delta cur={p.createdValue} prev={p.previous.createdValue} />
                    <Typography variant="body2" sx={{ mt: 1 }}>Converted (won)</Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrencyCompact(p.wonValue)}</Typography>
                    <Delta cur={p.wonValue} prev={p.previous.wonValue} />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      {p.createdCount} created · {p.wonCount} won · win rate {p.winRate === null ? 'n/a' : `${p.winRate}%`}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 52-week chart */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">Last 52 weeks</Typography>
                <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
                  <ToggleButton value="both">Both</ToggleButton>
                  <ToggleButton value="created">Created</ToggleButton>
                  <ToggleButton value="won">Won</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ width: '100%', height: 300, mt: 1 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="week" interval={3} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} width={60} />
                    <Tooltip
                      formatter={(v: any) => formatCurrency(Number(v))}
                      labelFormatter={(l) => `Week of ${l}`}
                      contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, color: theme.palette.text.primary }}
                    />
                    <Legend />
                    {view !== 'won' && <Bar dataKey="Opportunity value created" fill={theme.palette.primary.main} />}
                    {view !== 'created' && <Bar dataKey="Won (converted)" fill={theme.palette.success.main} />}
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ overflowX: 'auto', mt: 1 }}>
                <details>
                  <summary style={{ cursor: 'pointer' }}>Show weekly figures</summary>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Week of</TableCell>
                        <TableCell align="right">Created</TableCell><TableCell align="right">#</TableCell>
                        <TableCell align="right">Won</TableCell><TableCell align="right">#</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...overview.weekly].reverse().map((w: any) => (
                        <TableRow key={w.weekStart}>
                          <TableCell>{w.weekStart}</TableCell>
                          <TableCell align="right">{formatCurrency(w.createdValue)}</TableCell><TableCell align="right">{w.createdCount}</TableCell>
                          <TableCell align="right">{formatCurrency(w.wonValue)}</TableCell><TableCell align="right">{w.wonCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </details>
              </Box>
            </CardContent>
          </Card>

          {/* Targets */}
          <Typography variant="h5" sx={{ mb: 1 }}>Targets</Typography>
          {targets.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {canCreateTarget ? 'No targets yet. Use “Set target” to add one for a date range.' : 'No targets have been set for you yet.'}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {targets.map((t) => {
              const p = t.progress;
              const pace = PACE[p.pace];
              return (
                <Grid item xs={12} md={6} key={t.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Box>
                          <Typography variant="h6">{t.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {METRIC_LABEL[t.metric]} · {t.ownerName} · {t.startDate} → {t.endDate}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="flex-start">
                          <Chip size="small" color={pace.color} label={pace.label} />
                          {(canEditTarget || canDeleteTarget) && (
                            <>
                              {canEditTarget && <MuiTooltip title="Edit"><IconButton size="small" aria-label="Edit target" onClick={() => { setDialogError(''); setDialog({ id: t.id, form: { name: t.name, metric: t.metric, ownerId: t.ownerId || '', startDate: t.startDate, endDate: t.endDate, targetValue: String(t.targetValue) } }); }}><EditIcon fontSize="small" /></IconButton></MuiTooltip>}
                              {canDeleteTarget && <MuiTooltip title="Delete"><IconButton size="small" aria-label="Delete target" onClick={() => removeTarget(t)}><DeleteIcon fontSize="small" /></IconButton></MuiTooltip>}
                            </>
                          )}
                        </Stack>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{formatCurrency(p.achieved)} of {formatCurrency(p.target)}</Typography>
                          <Typography variant="body2" fontWeight={700}>{p.pctComplete}% complete</Typography>
                        </Box>
                        <Box sx={{ position: 'relative', mt: 0.5 }}>
                          <LinearProgress variant="determinate" value={Math.min(100, p.pctComplete)} color={p.pace === 'behind' || p.pace === 'ended-short' ? 'error' : 'success'} sx={{ height: 12, borderRadius: 1 }} />
                          {/* where straight-line pace says we should be today */}
                          <MuiTooltip title={`Time used: ${p.elapsedPct}%`}>
                            <Box sx={{ position: 'absolute', top: -3, bottom: -3, left: `${Math.min(100, p.elapsedPct)}%`, width: 2, bgcolor: 'text.primary' }} />
                          </MuiTooltip>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(p.remaining)} left to go · {p.daysLeft} day{p.daysLeft === 1 ? '' : 's'} left · pace needs {formatCurrency(p.expectedByNow)} by today
                          {p.projectedFinal !== null && ` · on course for ${formatCurrency(p.projectedFinal)}`}
                        </Typography>
                      </Box>

                      {t.suggestion && (
                        <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                          <Typography variant="body2" fontWeight={600}>What it takes to close the gap</Typography>
                          <Typography variant="body2">
                            To win the remaining {formatCurrency(t.suggestion.remaining)} at a {t.suggestion.winRateUsed}% win rate ({t.suggestion.winRateSource}),
                            you need about <strong>{formatCurrency(t.suggestion.recommendedPipeline)}</strong> of open pipeline
                            ({formatCurrency(t.suggestion.pipelineNeededByWinRate)} by win rate; {t.suggestion.coverage}× coverage rule gives {formatCurrency(t.suggestion.pipelineNeededByCoverage)}).
                            {' '}You have {formatCurrency(t.suggestion.currentOpenPipeline)} forecast to close in this window, so
                            {t.suggestion.newOpportunityValueNeeded > 0
                              ? <> create roughly <strong>{formatCurrency(t.suggestion.newOpportunityValueNeeded)}</strong> of new opportunity value.</>
                              : <> the pipeline already covers it.</>}
                          </Typography>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Alert severity="info" variant="outlined">
            Global benchmarks used for suggestions: B2B win rate ≈ {Math.round(overview.benchmarks.winRate * 100)}%, pipeline coverage ≈ {overview.benchmarks.pipelineCoverage}× target.
            {overview.ownWinRate === null
              ? ` Your own trailing-year win rate needs at least ${overview.benchmarks.minClosedDealsForOwnWinRate} closed deals, so the benchmark is used.`
              : ` Your trailing-year win rate is ${Math.round(overview.ownWinRate * 1000) / 10}% and is used where available.`}
            {' '}Open pipeline now: {formatCurrency(overview.openPipeline.value)} across {overview.openPipeline.count} deals.
          </Alert>
        </Box>
      )}

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.id ? 'Edit target' : 'Set target'}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {dialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" required value={dialog.form.name} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })} placeholder="e.g. Q3 revenue" />
              <TextField select label="What is measured" value={dialog.form.metric} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, metric: e.target.value } })}>
                <MenuItem value="won_value">Won revenue (deals closed won)</MenuItem>
                <MenuItem value="opportunity_value">New opportunity value created</MenuItem>
              </TextField>
              <TextField select label="For" value={dialog.form.ownerId} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, ownerId: e.target.value } })}>
                <MenuItem value="">Whole team</MenuItem>
                {owners.map((o) => <MenuItem key={o.id} value={o.id}>{o.firstName} {o.lastName}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth required type="date" label="From" InputLabelProps={{ shrink: true }} value={dialog.form.startDate} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, startDate: e.target.value } })} />
                <TextField fullWidth required type="date" label="To" InputLabelProps={{ shrink: true }} value={dialog.form.endDate} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, endDate: e.target.value } })} />
              </Stack>
              <TextField required type="number" label="Target value ($)" value={dialog.form.targetValue} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, targetValue: e.target.value } })} inputProps={{ min: 1 }} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveTarget} disabled={saving || !dialog?.form.name || !dialog?.form.startDate || !dialog?.form.endDate || !dialog?.form.targetValue}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev && !cur) return <Typography variant="caption" color="text.secondary">no activity</Typography>;
  if (!prev) return <Typography variant="caption" color="text.secondary">none in the prior period</Typography>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return (
    <Typography variant="caption" color={pct >= 0 ? 'success.main' : 'error.main'}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs prior period
    </Typography>
  );
}
