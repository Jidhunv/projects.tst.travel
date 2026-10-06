import React from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Collapse, Grid, IconButton, LinearProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency, formatCurrencyCompact } from '@utils/format';
import { exportToCsv } from '@utils/exportCsv';
import useAuth from '@hooks/useAuth';
import type { AccountHealth, HealthStatus, SalesHealthReport, Severity } from '../types/salesHealth';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'default';
const STATUS: Record<HealthStatus, { label: string; tone: Tone }> = {
  'on-track': { label: 'On track', tone: 'success' },
  'at-risk': { label: 'At risk', tone: 'warning' },
  derailed: { label: 'Derailed', tone: 'error' },
  'no-pipeline': { label: 'No pipeline', tone: 'default' },
};
const SEVERITY: Record<Severity, { label: string; tone: Tone }> = {
  critical: { label: 'Critical', tone: 'error' },
  high: { label: 'High', tone: 'warning' },
  medium: { label: 'Medium', tone: 'info' },
  low: { label: 'Low', tone: 'default' },
};

const EMPTY_FILTERS = { ownerId: '', tier: '', status: '', severity: '', flagCode: '', search: '', sort: 'score' };

export default function SalesHealthPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'Admin';
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [page, setPage] = React.useState(0);
  const [limit, setLimit] = React.useState(25);
  const [report, setReport] = React.useState<SalesHealthReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [owners, setOwners] = React.useState<any[]>([]);
  const [exporting, setExporting] = React.useState(false);
  const seq = React.useRef(0);

  const params = React.useMemo(() => {
    const p: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filters]);

  const updateFilters = (patch: Partial<typeof EMPTY_FILTERS>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  React.useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    setError('');
    api.getSalesHealth({ ...params, page: page + 1, limit })
      .then((res) => { if (mine === seq.current) setReport(res.data.data as SalesHealthReport); })
      .catch((e) => { if (mine === seq.current) setError(e?.response?.data?.error || e?.message || 'Failed to load sales health'); })
      .finally(() => { if (mine === seq.current) setLoading(false); });
  }, [params, page, limit]);

  React.useEffect(() => {
    if (!isAdmin) return;
    api.getUsers(1, 500)
      .then((r) => setOwners(r.data.data || []))
      .catch(() => setOwners([]));
  }, [isAdmin]);

  const exportAll = async () => {
    setExporting(true);
    try {
      const res = await api.getSalesHealth({ ...params, all: 'true' });
      const rows: AccountHealth[] = res.data.data.rows;
      exportToCsv('sales-cycle-health', [
        { header: 'Account', value: (r: AccountHealth) => r.accountName },
        { header: 'Tier', value: (r: AccountHealth) => r.tier || '' },
        { header: 'Owner', value: (r: AccountHealth) => r.ownerName },
        { header: 'Status', value: (r: AccountHealth) => STATUS[r.status].label },
        { header: 'Score', value: (r: AccountHealth) => r.score },
        { header: 'Days since last touch', value: (r: AccountHealth) => r.daysSinceTouch ?? 'never' },
        { header: 'Overdue follow-ups', value: (r: AccountHealth) => r.overdueFollowups },
        { header: 'Open pipeline', value: (r: AccountHealth) => r.pipelineValue },
        { header: 'Red flags', value: (r: AccountHealth) => r.flags.map((f) => `[${f.severity}] ${f.title}`).join(' | ') },
        { header: 'Next action', value: (r: AccountHealth) => r.nextAction },
      ], rows);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const s = report?.summary;
  const insights = React.useMemo(() => (s ? buildInsights(s) : []), [s]);
  const filtered = Object.entries(filters).some(([k, v]) => k !== 'sort' && v);

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Box>
          <Typography variant="h4">Sales Cycle Health</Typography>
          <Typography variant="body2" color="text.secondary">
            Is each account on the sales strategy, or has it derailed on missed follow-ups and stalled stages?
            {report && ` Updated ${new Date(report.generatedAt).toLocaleString()}.`}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={exportAll} disabled={exporting || !report || report.meta.total === 0}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, my: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="Search account" value={filters.search} onChange={(e) => updateFilters({ search: e.target.value })} />
          {isAdmin && (
            <TextField size="small" select label="Owner" sx={{ minWidth: 180 }} value={filters.ownerId} onChange={(e) => updateFilters({ ownerId: e.target.value })}>
              <MenuItem value="">All owners</MenuItem>
              {owners.map((o) => <MenuItem key={o.id} value={o.id}>{o.firstName} {o.lastName}</MenuItem>)}
            </TextField>
          )}
          <TextField size="small" select label="Tier" sx={{ minWidth: 110 }} value={filters.tier} onChange={(e) => updateFilters({ tier: e.target.value })}>
            <MenuItem value="">All tiers</MenuItem>
            {['T1', 'T2', 'T3', 'T4', 'T5'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Status" sx={{ minWidth: 140 }} value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })}>
            <MenuItem value="">All statuses</MenuItem>
            {(Object.keys(STATUS) as HealthStatus[]).map((k) => <MenuItem key={k} value={k}>{STATUS[k].label}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Has flag of" sx={{ minWidth: 150 }} value={filters.severity} onChange={(e) => updateFilters({ severity: e.target.value })}>
            <MenuItem value="">Any severity</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High or worse</MenuItem>
            <MenuItem value="medium">Medium or worse</MenuItem>
          </TextField>
          <TextField size="small" select label="Sort by" sx={{ minWidth: 170 }} value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value })}>
            <MenuItem value="score">Worst health first</MenuItem>
            <MenuItem value="value">Pipeline value</MenuItem>
            <MenuItem value="overdue">Most overdue follow-ups</MenuItem>
            <MenuItem value="quiet">Longest quiet</MenuItem>
            <MenuItem value="name">Account name</MenuItem>
          </TextField>
          <Button onClick={() => updateFilters(EMPTY_FILTERS)} disabled={!filtered && filters.sort === 'score'}>Clear</Button>
        </Stack>
        {filters.flagCode && (
          <Box sx={{ mt: 1 }}>
            <Chip color="primary" size="small" label={`Flag: ${s?.flagsByCode.find((c) => c.code === filters.flagCode)?.title || filters.flagCode}`} onDelete={() => updateFilters({ flagCode: '' })} />
          </Box>
        )}
      </Paper>

      {loading && !report && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>}

      {s && (
        <Box sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Kpi label="Accounts analysed" value={String(s.total)} sub={`avg health score ${s.avgScore}/100`} tone="info" />
            <Kpi label="On track" value={String(s.byStatus['on-track'])} sub={pct(s.byStatus['on-track'], s.total)} tone="success" onClick={() => updateFilters({ status: 'on-track' })} />
            <Kpi label="At risk" value={String(s.byStatus['at-risk'])} sub={pct(s.byStatus['at-risk'], s.total)} tone="warning" onClick={() => updateFilters({ status: 'at-risk' })} />
            <Kpi label="Derailed" value={String(s.byStatus.derailed)} sub={pct(s.byStatus.derailed, s.total)} tone="error" onClick={() => updateFilters({ status: 'derailed' })} />
            <Kpi label="Pipeline at risk" value={formatCurrencyCompact(s.pipelineAtRisk)} sub={`of ${formatCurrencyCompact(s.pipelineTotal)} open (${pct(s.pipelineAtRisk, s.pipelineTotal)})`} tone="error" />
          </Grid>

          {s.total > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Health distribution</Typography>
                <StatusBar byStatus={s.byStatus} total={s.total} />
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>What management should know</Typography>
                <Stack spacing={1}>
                  {insights.map((i, idx) => <Alert key={idx} severity={i.severity}>{i.text}</Alert>)}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Red-flag breakdown */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Red flags by type</Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                    {(Object.keys(SEVERITY) as Severity[]).map((k) => (
                      <Chip key={k} size="small" color={SEVERITY[k].tone} variant={s.flagsBySeverity[k] ? 'filled' : 'outlined'} label={`${SEVERITY[k].label}: ${s.flagsBySeverity[k]}`} />
                    ))}
                  </Stack>
                  {s.flagsByCode.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No red flags in this view.</Typography>
                  ) : (
                    <Table size="small">
                      <TableBody>
                        {s.flagsByCode.map((c) => (
                          <TableRow key={c.code} hover sx={{ cursor: 'pointer', bgcolor: filters.flagCode === c.code ? 'action.selected' : undefined }} onClick={() => updateFilters({ flagCode: filters.flagCode === c.code ? '' : c.code })}>
                            <TableCell><Chip size="small" color={SEVERITY[c.severity].tone} label={SEVERITY[c.severity].label} /></TableCell>
                            <TableCell>{c.title}</TableCell>
                            <TableCell align="right">{c.accounts} {c.accounts === 1 ? 'account' : 'accounts'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Owner accountability */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Accountability by owner</Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Owner</TableCell>
                          <TableCell align="right">Accts</TableCell>
                          <TableCell align="right">Derailed</TableCell>
                          <TableCell align="right">At risk</TableCell>
                          <TableCell align="right">Overdue</TableCell>
                          <TableCell align="right">Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {s.byOwner.map((o) => (
                          <TableRow key={o.ownerId || 'none'} hover sx={{ cursor: isAdmin && o.ownerId ? 'pointer' : 'default' }} onClick={() => isAdmin && o.ownerId && updateFilters({ ownerId: o.ownerId })}>
                            <TableCell>{o.ownerName}</TableCell>
                            <TableCell align="right">{o.accounts}</TableCell>
                            <TableCell align="right"><Typography variant="body2" color={o.derailed ? 'error' : 'text.secondary'} fontWeight={o.derailed ? 700 : 400}>{o.derailed}</Typography></TableCell>
                            <TableCell align="right"><Typography variant="body2" color={o.atRisk ? 'warning.main' : 'text.secondary'}>{o.atRisk}</Typography></TableCell>
                            <TableCell align="right">{o.overdueFollowups}</TableCell>
                            <TableCell align="right">{o.onTrack + o.atRisk + o.derailed > 0 ? o.avgScore : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Tier view */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Health by tier</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Higher tiers carry a tighter follow-up cadence, so a derailed T1 matters more than a derailed T5.</Typography>
                  <Stack spacing={1}>
                    {s.byTier.map((t) => (
                      <Box key={t.tier} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ width: 80 }}>{t.tier}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <StatusBar byStatus={{ 'on-track': t.onTrack, 'at-risk': t.atRisk, derailed: t.derailed, 'no-pipeline': t.accounts - t.onTrack - t.atRisk - t.derailed }} total={t.accounts} thin />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ width: 90, textAlign: 'right' }}>{t.accounts} accts</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Account table */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Accounts ({report!.meta.total})</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={40} />
                      <TableCell>Account</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell align="right">Last touch</TableCell>
                      <TableCell align="right">Overdue</TableCell>
                      <TableCell align="right">Open pipeline</TableCell>
                      <TableCell>Top red flag</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report!.rows.map((r) => <AccountRow key={r.accountId} r={r} />)}
                    {report!.rows.length === 0 && (
                      <TableRow><TableCell colSpan={9} align="center">{filtered ? 'No accounts match these filters' : 'No accounts to analyse yet'}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination
                component="div"
                count={report!.meta.total}
                page={page}
                rowsPerPage={limit}
                rowsPerPageOptions={[10, 25, 50, 100]}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
              />
              {loading && <LinearProgress />}
            </CardContent>
          </Card>

          <StrategyRules strategy={report!.strategy} />
        </Box>
      )}
    </Layout>
  );
}

function AccountRow({ r }: { r: AccountHealth }) {
  const [open, setOpen] = React.useState(false);
  const top = r.flags[0];
  return (
    <>
      <TableRow hover sx={{ '& > td': { borderBottom: open ? 'unset' : undefined } }}>
        <TableCell>
          <IconButton size="small" aria-label={open ? 'Collapse details' : 'Expand details'} onClick={() => setOpen(!open)} disabled={r.flags.length === 0}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>{r.accountName}</Typography>
          <Typography variant="caption" color="text.secondary">{r.tier || 'Untiered'} · {r.openLeads} lead{r.openLeads === 1 ? '' : 's'} · {r.openOpportunities} deal{r.openOpportunities === 1 ? '' : 's'}</Typography>
        </TableCell>
        <TableCell>{r.ownerName || '-'}</TableCell>
        <TableCell><Chip size="small" color={STATUS[r.status].tone} label={STATUS[r.status].label} /></TableCell>
        <TableCell align="right">
          <Tooltip title={`${r.flags.length} red flag${r.flags.length === 1 ? '' : 's'}`}>
            <Typography variant="body2" fontWeight={700} color={r.score >= 75 ? 'success.main' : r.score >= 50 ? 'warning.main' : 'error.main'}>{r.score}</Typography>
          </Tooltip>
        </TableCell>
        <TableCell align="right">{r.daysSinceTouch === null ? <Typography variant="body2" color="error">Never</Typography> : `${r.daysSinceTouch}d ago`}</TableCell>
        <TableCell align="right">{r.overdueFollowups > 0 ? <Typography variant="body2" color="error" fontWeight={700}>{r.overdueFollowups}</Typography> : 0}</TableCell>
        <TableCell align="right">{r.pipelineValue ? formatCurrency(r.pipelineValue) : '-'}</TableCell>
        <TableCell>
          {top ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" color={SEVERITY[top.severity].tone} label={SEVERITY[top.severity].label} />
              <Typography variant="body2">{top.title}{r.flags.length > 1 ? ` (+${r.flags.length - 1})` : ''}</Typography>
            </Stack>
          ) : <Typography variant="body2" color="text.secondary">None</Typography>}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, borderBottom: open ? undefined : 'unset' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Stack spacing={1}>
                {r.flags.map((f, i) => (
                  <Box key={i} sx={{ p: 1.5, borderLeft: 4, borderColor: `${SEVERITY[f.severity].tone === 'default' ? 'divider' : SEVERITY[f.severity].tone + '.main'}`, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip size="small" color={SEVERITY[f.severity].tone} label={SEVERITY[f.severity].label} />
                      <Typography variant="body2" fontWeight={600}>{f.title}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{f.detail}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Do:</strong> {f.action}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function Kpi({ label, value, sub, tone, onClick }: { label: string; value: string; sub: string; tone: Tone; onClick?: () => void }) {
  return (
    <Grid item xs={6} md={2.4 as any} sx={{ flexBasis: { md: '20%' }, maxWidth: { md: '20%' } }}>
      <Card onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default', height: '100%', borderLeft: 4, borderColor: tone === 'default' ? 'divider' : `${tone}.main` }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{sub}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function StatusBar({ byStatus, total, thin }: { byStatus: Record<HealthStatus, number>; total: number; thin?: boolean }) {
  const order: { k: HealthStatus; color: string }[] = [
    { k: 'on-track', color: 'success.main' }, { k: 'at-risk', color: 'warning.main' },
    { k: 'derailed', color: 'error.main' }, { k: 'no-pipeline', color: 'action.disabled' },
  ];
  return (
    <Box>
      <Box sx={{ display: 'flex', height: thin ? 10 : 18, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
        {order.map(({ k, color }) => byStatus[k] > 0 && (
          <Tooltip key={k} title={`${STATUS[k].label}: ${byStatus[k]} (${pct(byStatus[k], total)})`}>
            <Box sx={{ width: `${(byStatus[k] / total) * 100}%`, bgcolor: color }} />
          </Tooltip>
        ))}
      </Box>
      {!thin && (
        <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          {order.map(({ k, color }) => (
            <Stack key={k} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
              <Typography variant="caption">{STATUS[k].label} {byStatus[k]}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function StrategyRules({ strategy: S }: { strategy: Record<string, any> }) {
  const cadence = Object.entries(S.tierTouchCadenceDays as Record<string, number>).map(([t, d]) => `${t}: every ${d}d`).join(' · ');
  const rules: [string, string][] = [
    ['Touch cadence', `${cadence}. Applies to accounts with live pipeline; a gap beyond 2× is High and beyond 3× is Critical.`],
    ['First contact', `An account with live pipeline needs a logged contact within ${S.firstTouchGraceDays} days.`],
    ['Follow-ups', `Overdue ${S.overdueFollowupHighDays}+ days is High, ${S.overdueFollowupCriticalDays}+ days is Critical. Visits need a follow-up within ${S.visitFollowupGraceDays} days. Completion below ${Math.round(S.followupCompletionMin * 100)}% (once ${S.followupCompletionMinSample}+ have fallen due) is flagged.`],
    ['Leads', `First contact within ${S.leadFirstActionDays} days; convert or close within ${S.leadToOpportunityDays} days. Prospects should yield a lead within ${S.accountToLeadDays} days.`],
    ['Stage time (no update)', Object.entries(S.stageMaxDays as Record<string, number>).map(([k, d]) => `${k} ${d}d`).join(' · ') + '. Twice the limit is High.'],
    ['Deal cycle & close date', `Open longer than ${S.opportunityCycleDays} days is slow. A passed close date is High, over ${S.closeDateWarnDays} days past is Critical. Closing within ${S.closeDateWarnDays} days while still early-stage is flagged.`],
    ['Buying committee', `Proposal and Negotiation need ${(S.requiredRolesByStage.Proposal || []).join(' and ')}. A Champion is expected from ${S.championFromStage}.`],
    ['Scoring', `Start at 100; Critical −${S.scorePenalty.critical}, High −${S.scorePenalty.high}, Medium −${S.scorePenalty.medium}, Low −${S.scorePenalty.low}. Any Critical flag, or a score under ${S.statusThresholds.atRiskMinScore}, is Derailed. Any High flag, or under ${S.statusThresholds.onTrackMinScore}, is At risk.`],
  ];
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Sales strategy rules used</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Time in stage is measured from the last update to the deal, as stage changes are not logged separately. Only completed calls, emails, meetings, tasks and sales visits count as customer contact; notes do not.
        </Typography>
        <Table size="small">
          <TableBody>
            {rules.map(([k, v]) => (
              <TableRow key={k}><TableCell sx={{ width: 200, fontWeight: 600 }}>{k}</TableCell><TableCell>{v}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionDetails>
    </Accordion>
  );
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '0%');

function buildInsights(s: SalesHealthReport['summary']): { severity: 'error' | 'warning' | 'info' | 'success'; text: string }[] {
  const out: { severity: 'error' | 'warning' | 'info' | 'success'; text: string }[] = [];
  const live = s.byStatus['on-track'] + s.byStatus['at-risk'] + s.byStatus.derailed;
  if (live === 0) return out;
  const off = s.byStatus['at-risk'] + s.byStatus.derailed;
  if (s.byStatus.derailed > 0) {
    out.push({ severity: 'error', text: `${s.byStatus.derailed} of ${live} accounts with live pipeline have derailed from the sales strategy, and ${formatCurrencyCompact(s.pipelineAtRisk)} of open pipeline sits on accounts that are at risk or derailed (${pct(s.pipelineAtRisk, s.pipelineTotal)}).` });
  } else if (off > 0) {
    out.push({ severity: 'warning', text: `${off} of ${live} accounts with live pipeline are at risk. None have derailed yet — this is the window to intervene.` });
  } else {
    out.push({ severity: 'success', text: `All ${live} accounts with live pipeline are on the sales track.` });
  }
  const fu = s.flagsByCode.find((c) => c.code === 'OVERDUE_FOLLOWUP');
  const overdueTotal = s.byOwner.reduce((a, o) => a + o.overdueFollowups, 0);
  if (fu) out.push({ severity: 'error', text: `Follow-up discipline is the main gap: ${overdueTotal} follow-ups are overdue across ${fu.accounts} accounts.` });
  const gap = s.flagsByCode.find((c) => c.code === 'TOUCH_GAP' || c.code === 'NO_TOUCH_EVER');
  if (gap) out.push({ severity: 'warning', text: `${s.flagsByCode.filter((c) => c.code === 'TOUCH_GAP' || c.code === 'NO_TOUCH_EVER').reduce((a, c) => a + c.accounts, 0)} accounts have gone quiet beyond their tier's contact cadence.` });
  const stalled = s.flagsByCode.find((c) => c.code === 'OPP_STALLED' || c.code === 'OPP_CLOSE_DATE_PASSED');
  if (stalled) out.push({ severity: 'warning', text: `Deals are stalling: ${s.flagsByCode.filter((c) => c.code === 'OPP_STALLED' || c.code === 'OPP_CLOSE_DATE_PASSED').map((c) => `${c.accounts} ${c.title.toLowerCase()}`).join(', ')}.` });
  const worst = s.byOwner.filter((o) => o.derailed > 0)[0];
  if (worst && s.byOwner.length > 1) out.push({ severity: 'info', text: `${worst.ownerName} has the most derailed accounts (${worst.derailed} of ${worst.accounts}). Worth a pipeline review.` });
  return out;
}
