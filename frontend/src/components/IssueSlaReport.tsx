import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { api } from '@services/api';
import { exportToCsv } from '@utils/exportCsv';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const stamp = (v: any) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const hrs = (h: number | null | undefined) => (h === null || h === undefined ? '-' : h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} d`);
const STATE: Record<string, { label: string; color: 'success' | 'error' | 'info' | 'default' }> = {
  met: { label: 'Met', color: 'success' }, breached: { label: 'Breached', color: 'error' },
  within: { label: 'Running', color: 'info' }, 'n/a': { label: 'n/a', color: 'default' },
};
const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'default' };

// Response and resolution times for client issues, judged against SLA targets.
export default function IssueSlaReport({ staff }: { staff: any[] }) {
  const [from, setFrom] = React.useState(() => iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = React.useState(() => iso(new Date()));
  const [priority, setPriority] = React.useState('');
  const [assignee, setAssignee] = React.useState('');
  const [state, setState] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [limit, setLimit] = React.useState(25);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const params = React.useMemo(() => ({ from, to, ...(priority ? { priority } : {}), ...(assignee ? { assigneeId: assignee } : {}), ...(state ? { state } : {}) }), [from, to, priority, assignee, state]);
  React.useEffect(() => { setPage(0); }, [params]);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    api.getIssueSlaReport({ ...params, page: page + 1, limit })
      .then((r) => { if (live) { setData(r.data.data); setError(''); } })
      .catch((e) => { if (live) setError(errMsg(e, 'Failed to load the SLA report')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [params, page, limit]);

  const exportAll = async () => {
    try {
      const r = await api.getIssueSlaReport({ ...params, all: 'true' });
      exportToCsv(`issue-sla-${from}-to-${to}`, [
        { header: 'Client', value: (x: any) => x.accountName }, { header: 'Ticket', value: (x: any) => x.ticketNumber },
        { header: 'Issue', value: (x: any) => `#${x.issueNumber} ${x.title}` }, { header: 'Priority', value: (x: any) => x.priority },
        { header: 'Developer', value: (x: any) => x.assigneeName || '' }, { header: 'Stage', value: (x: any) => x.stage },
        { header: 'Logged', value: (x: any) => stamp(x.loggedAt) },
        { header: 'First response', value: (x: any) => (x.respondedAt ? stamp(x.respondedAt) : '') },
        { header: 'Response hours', value: (x: any) => x.responseHours ?? '' }, { header: 'Response target (h)', value: (x: any) => x.responseTarget },
        { header: 'Response SLA', value: (x: any) => STATE[x.response].label },
        { header: 'Resolved (deployed)', value: (x: any) => (x.resolvedAt ? stamp(x.resolvedAt) : '') },
        { header: 'Resolution hours', value: (x: any) => x.resolutionHours ?? '' }, { header: 'Resolution target (h)', value: (x: any) => x.resolutionTarget },
        { header: 'Resolution SLA', value: (x: any) => STATE[x.resolution].label },
        { header: 'Closed', value: (x: any) => (x.closedAt ? stamp(x.closedAt) : '') }, { header: 'Days to close', value: (x: any) => x.daysToClose ?? '' },
        { header: 'Days open', value: (x: any) => x.daysOpen },
      ], r.data.data.rows);
    } catch (e) { setError(errMsg(e, 'Export failed')); }
  };

  const s = data?.summary;
  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField size="small" type="date" label="Logged from" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField size="small" type="date" label="to" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
            <TextField size="small" select label="Priority" sx={{ minWidth: 130 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
              <MenuItem value="">All</MenuItem>{['Critical', 'High', 'Medium', 'Low'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField size="small" select label="Show" sx={{ minWidth: 130 }} value={state} onChange={(e) => setState(e.target.value)}>
              <MenuItem value="">All issues</MenuItem><MenuItem value="open">Open</MenuItem><MenuItem value="closed">Closed</MenuItem>
            </TextField>
            {staff.length > 1 && (
              <TextField size="small" select label="Developer" sx={{ minWidth: 170 }} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <MenuItem value="">Anyone</MenuItem>{staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
              </TextField>
            )}
            <Button variant="outlined" onClick={exportAll} disabled={!data || data.meta.total === 0}>Export CSV</Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading && !data && <LinearProgress />}

      {s && (
        <Box sx={{ opacity: loading ? 0.6 : 1 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Stat label="Issues logged" value={String(s.issues)} sub={`${s.openIssues} still open`} />
            <Stat label="Avg first response" value={hrs(s.response.avgHours)} sub={`median ${hrs(s.response.medianHours)}`} />
            <Stat label="Response within SLA" value={s.response.pctWithinSla === null ? 'n/a' : `${s.response.pctWithinSla}%`} sub={`${s.response.met} met · ${s.response.breached} breached`} color={pctColor(s.response.pctWithinSla)} />
            <Stat label="Avg resolution" value={hrs(s.resolution.avgHours)} sub={`median ${hrs(s.resolution.medianHours)} (to deployment)`} />
            <Stat label="Resolution within SLA" value={s.resolution.pctWithinSla === null ? 'n/a' : `${s.resolution.pctWithinSla}%`} sub={`${s.resolution.met} met · ${s.resolution.breached} breached`} color={pctColor(s.resolution.pctWithinSla)} />
            <Stat label="Avg time to close" value={s.avgDaysToClose === null ? 'n/a' : `${s.avgDaysToClose} d`} sub={`${s.closedCount} closed`} />
          </Grid>
          {s.breachingNow > 0 && <Alert severity="error" sx={{ mb: 2 }}>{s.breachingNow} open issue{s.breachingNow === 1 ? ' is' : 's are'} past an SLA target right now.</Alert>}

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}><Breakdown title="By priority" rows={data.byPriority} extra={(r: any) => r.targets ? `target ${r.targets.responseHours}h response · ${r.targets.resolutionHours}h resolve` : ''} /></Grid>
            <Grid item xs={12} md={6}><Breakdown title="By developer" rows={data.byDeveloper} /></Grid>
            <Grid item xs={12}><Breakdown title="By client" rows={data.byClient} /></Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Issues ({data.meta.total})</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Client / issue</TableCell><TableCell>Priority</TableCell><TableCell>Logged</TableCell>
                      <TableCell>First response</TableCell><TableCell>Resolved (deployed)</TableCell><TableCell>Closed</TableCell><TableCell align="right">Days open</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.rows.map((r: any) => (
                      <TableRow key={r.id} sx={r.breachingNow ? { bgcolor: 'action.hover' } : undefined}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{r.accountName}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.ticketNumber} #{r.issueNumber} · {r.title}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">{r.stage}{r.assigneeName ? ` · ${r.assigneeName}` : ''}</Typography>
                        </TableCell>
                        <TableCell><Chip size="small" color={PRIORITY_COLOR[r.priority]} label={r.priority} /></TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{stamp(r.loggedAt)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title={`Target ${r.responseTarget} h`}><Chip size="small" color={STATE[r.response].color} label={`${STATE[r.response].label} · ${hrs(r.responseHours)}`} /></Tooltip>
                          <Typography variant="caption" color="text.secondary" display="block">{r.respondedAt ? stamp(r.respondedAt) : 'not yet'}</Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title={`Target ${r.resolutionTarget} h`}><Chip size="small" color={STATE[r.resolution].color} label={`${STATE[r.resolution].label} · ${hrs(r.resolutionHours)}`} /></Tooltip>
                          <Typography variant="caption" color="text.secondary" display="block">{r.resolvedAt ? stamp(r.resolvedAt) : 'not yet'}</Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.closedAt ? <>{stamp(r.closedAt)}<Typography variant="caption" color="text.secondary" display="block">{r.daysToClose} d to close</Typography></> : r.stage === 'Cancelled' ? 'Cancelled' : '-'}</TableCell>
                        <TableCell align="right">{r.daysOpen}</TableCell>
                      </TableRow>
                    ))}
                    {data.rows.length === 0 && <TableRow><TableCell colSpan={7} align="center">No issues were logged in this period.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination component="div" count={data.meta.total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 25, 50, 100]}
                onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }} />
            </CardContent>
          </Card>

          <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
            How it is measured: both clocks start when the issue is logged. <strong>Response</strong> stops at the first action on it; <strong>resolution</strong> stops when it is deployed to production
            (closing also needs the customer's feedback and is shown separately). The clock is paused while the issue is waiting on the customer (User acceptance) or On hold.
            Targets come from the ticket's SLA hours when set, otherwise from the priority: {Object.entries(data.rules.defaults).map(([k, v]: any) => `${k} ${v.responseHours}h / ${v.resolutionHours}h`).join(' · ')}. Hours are calendar hours.
          </Alert>
        </Box>
      )}
    </>
  );
}

const pctColor = (p: number | null) => (p === null ? undefined : p >= 90 ? 'success.main' : p >= 70 ? 'warning.main' : 'error.main');

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Grid item xs={6} md={2}>
      <Card sx={{ height: '100%', borderLeft: 4, borderColor: color || 'divider' }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="h6" fontWeight={700}>{value}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </CardContent>
      </Card>
    </Grid>
  );
}

function Breakdown({ title, rows, extra }: { title: string; rows: any[]; extra?: (r: any) => string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{title.replace('By ', '')}</TableCell><TableCell align="right">Issues</TableCell><TableCell align="right">Avg response</TableCell>
                <TableCell align="right">Resp. in SLA</TableCell><TableCell align="right">Avg resolve</TableCell><TableCell align="right">Res. in SLA</TableCell><TableCell align="right">Breaching</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell>{r.label}{extra && extra(r) && <Typography variant="caption" color="text.secondary" display="block">{extra(r)}</Typography>}</TableCell>
                  <TableCell align="right">{r.issues}</TableCell>
                  <TableCell align="right">{hrs(r.response.avgHours)}</TableCell>
                  <TableCell align="right"><Typography variant="body2" color={pctColor(r.response.pctWithinSla)}>{r.response.pctWithinSla === null ? '-' : `${r.response.pctWithinSla}%`}</Typography></TableCell>
                  <TableCell align="right">{hrs(r.resolution.avgHours)}</TableCell>
                  <TableCell align="right"><Typography variant="body2" color={pctColor(r.resolution.pctWithinSla)}>{r.resolution.pctWithinSla === null ? '-' : `${r.resolution.pctWithinSla}%`}</Typography></TableCell>
                  <TableCell align="right">{r.breachingNow > 0 ? <Typography variant="body2" color="error" fontWeight={700}>{r.breachingNow}</Typography> : 0}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} align="center">No data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
}
