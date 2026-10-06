import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency } from '@utils/format';
import { exportToCsv } from '@utils/exportCsv';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const METRIC: Record<string, string> = { won_value: 'Won revenue', opportunity_value: 'New opportunity value' };

const PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
  { key: 'today', label: 'Today', range: () => [iso(new Date()), iso(new Date())] },
  { key: 'yesterday', label: 'Yesterday', range: () => [iso(addDays(new Date(), -1)), iso(addDays(new Date(), -1))] },
  { key: '7d', label: 'Last 7 days', range: () => [iso(addDays(new Date(), -6)), iso(new Date())] },
  { key: 'month', label: 'This month', range: () => { const n = new Date(); return [iso(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1))), iso(n)]; } },
  { key: 'lastmonth', label: 'Last month', range: () => { const n = new Date(); return [iso(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 1))), iso(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 0)))]; } },
];

const pctColor = (p: number | null): 'success' | 'warning' | 'error' | 'inherit' => (p === null ? 'inherit' : p >= 100 ? 'success' : p >= 60 ? 'warning' : 'error');
const fmtVal = (v: number, unit?: string | null) => `${Math.round(v * 100) / 100}${unit ? ` ${unit}` : ''}`;

// One report for the daily and weekly meeting: combined for the team, or one person at a time.
export default function MeetingReportPage() {
  const [preset, setPreset] = React.useState('today');
  const [[from, to], setRange] = React.useState<[string, string]>(() => PRESETS[0].range());
  const [person, setPerson] = React.useState(''); // '' = combined
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    api.getMeetingReport({ from, to })
      .then((r) => { if (live) setData(r.data.data); })
      .catch((e) => { if (live) { setData(null); setError(errMsg(e, 'Failed to load the report')); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [from, to]);

  const people: any[] = data?.people || [];
  const selected = people.find((p) => p.userId === person) || null;
  // If the chosen person is not in the new range's data, fall back to combined.
  React.useEffect(() => { if (person && data && !selected) setPerson(''); }, [person, data, selected]);

  const choose = (key: string) => { setPreset(key); const p = PRESETS.find((x) => x.key === key); if (p) setRange(p.range()); };
  const days = data?.workdays?.length ?? 0;
  const showDaily = (data?.workdays?.length ?? 0) > 0 && (data?.workdays?.length ?? 0) <= 10;

  const exportCsv = () => {
    const rows: any[] = [];
    for (const p of selected ? [selected] : people) {
      if (p.kpis.length === 0) rows.push({ person: p.name, kpi: '', total: '', target: '', pct: '', p });
      for (const k of p.kpis) rows.push({ person: p.name, kpi: k.name, total: k.total, target: k.target ?? '', pct: k.pct ?? '', p });
    }
    exportToCsv(`kpi-report-${from}-to-${to}`, [
      { header: 'Staff', value: (r: any) => r.person },
      { header: 'KPI', value: (r: any) => r.kpi },
      { header: 'Reported', value: (r: any) => r.total },
      { header: 'Target for range', value: (r: any) => r.target },
      { header: '% of target', value: (r: any) => r.pct },
      { header: 'Reporting days (due)', value: (r: any) => r.p.compliance.dueDays },
      { header: 'Days reported', value: (r: any) => r.p.compliance.reportedDays },
      { header: 'Missed days', value: (r: any) => r.p.compliance.missedDates.join(' ') },
      { header: 'Opp value created', value: (r: any) => r.p.pipeline.createdValue },
      { header: 'Won value', value: (r: any) => r.p.pipeline.wonValue },
      { header: 'Leads created', value: (r: any) => r.p.pipeline.leadsCreated },
      { header: 'Visits logged', value: (r: any) => r.p.pipeline.visitsLogged },
    ], rows);
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4">KPI Meeting Report</Typography>
          <Typography variant="body2" color="text.secondary">Daily and weekly review: who reported, how KPIs are tracking, pipeline movement and projections.</Typography>
        </Box>
        <Button variant="outlined" onClick={exportCsv} disabled={!data || people.length === 0}>Export CSV</Button>
      </Box>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={preset} onChange={(_, v) => v && choose(v)}>
          {PRESETS.map((p) => <ToggleButton key={p.key} value={p.key}>{p.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => { setPreset('custom'); setRange([e.target.value, to < e.target.value ? e.target.value : to]); }} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => { setPreset('custom'); setRange([from > e.target.value ? e.target.value : from, e.target.value]); }} />
        <TextField size="small" select label="View" sx={{ minWidth: 200 }} value={person} onChange={(e) => setPerson(e.target.value)} disabled={people.length === 0}>
          <MenuItem value="">Combined (whole team)</MenuItem>
          {people.map((p) => <MenuItem key={p.userId} value={p.userId}>{p.name}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {data && people.length === 0 && !loading && <Alert severity="info">No staff have KPIs, projections or pipeline activity in this range.</Alert>}

      {data && people.length > 0 && (selected ? <Individual p={selected} showDaily={showDaily} workdays={data.workdays} today={data.today} /> : <Combined data={data} onPick={setPerson} />)}
      {data && days > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>{days} working day{days === 1 ? '' : 's'} in range (Fri/Sat treated as weekend). A day counts as reported when at least one KPI answer is dated that day; today is not counted as missed until it ends.</Typography>}
    </Layout>
  );
}

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

function PipelineStats({ pl }: { pl: any }) {
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Stat label="Opportunity value created" value={formatCurrency(pl.createdValue)} sub={`${pl.createdCount} deals`} color="primary.main" />
      <Stat label="Won" value={formatCurrency(pl.wonValue)} sub={`${pl.wonCount} deals`} color="success.main" />
      <Stat label="Leads created" value={String(pl.leadsCreated)} />
      <Stat label="Visits / calls logged" value={String(pl.visitsLogged)} />
    </Grid>
  );
}

function ProjectionTable({ rows, showStaff }: { rows: any[]; showStaff?: boolean }) {
  if (rows.length === 0) return <Typography variant="body2" color="text.secondary">No projections entered for these months.</Typography>;
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead><TableRow><TableCell>Month</TableCell><TableCell>Metric</TableCell>{showStaff && <TableCell align="right">Staff</TableCell>}<TableCell align="right">Projected</TableCell><TableCell align="right">Actual so far</TableCell><TableCell align="right">% of projection</TableCell><TableCell>Note</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{String(r.month).slice(0, 7)}</TableCell><TableCell>{METRIC[r.metric]}</TableCell>
              {showStaff && <TableCell align="right">{r.staff}</TableCell>}
              <TableCell align="right">{formatCurrency(r.projected)}</TableCell><TableCell align="right">{formatCurrency(r.actual)}</TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight={700} color={`${pctColor(r.pct)}.main`}>{r.pct === null ? '-' : `${r.pct}%`}</Typography></TableCell>
              <TableCell>{r.note || ''}{r.revisions > 1 ? <Typography variant="caption" color="text.secondary" display="block">revised {r.revisions - 1}×</Typography> : null}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function Combined({ data, onPick }: { data: any; onPick: (id: string) => void }) {
  const c = data.combined;
  const people: any[] = data.people;
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Stat label="Staff in report" value={String(c.staff)} color="info.main" />
        <Stat label="Reporting compliance" value={c.compliance.pct === null ? 'n/a' : `${c.compliance.pct}%`} sub={`${c.compliance.reportedDays} of ${c.compliance.dueDays} staff-days`} color={`${pctColor(c.compliance.pct)}.main`} />
      </Grid>
      {c.compliance.todayPending.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>Not reported yet today: {c.compliance.todayPending.join(', ')}</Alert>
      )}
      <PipelineStats pl={c.pipeline} />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>By staff</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell><TableCell align="right">Reported days</TableCell><TableCell>Missed</TableCell>
                  <TableCell align="right">Created</TableCell><TableCell align="right">Won</TableCell><TableCell align="right">Leads</TableCell><TableCell align="right">Visits</TableCell><TableCell align="right">KPIs on target</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {people.map((p) => {
                  const withTarget = p.kpis.filter((k: any) => k.pct !== null);
                  const met = withTarget.filter((k: any) => k.pct >= 100).length;
                  return (
                    <TableRow key={p.userId} hover sx={{ cursor: 'pointer' }} onClick={() => onPick(p.userId)}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{p.name}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" color={`${pctColor(p.compliance.pct)}.main`} fontWeight={700}>{p.compliance.pct === null ? '-' : `${p.compliance.reportedDays}/${p.compliance.dueDays} (${p.compliance.pct}%)`}</Typography></TableCell>
                      <TableCell>{p.compliance.missedDates.length === 0 ? '-' : <Chip size="small" color="error" label={`${p.compliance.missedDates.length} day${p.compliance.missedDates.length === 1 ? '' : 's'}`} />}</TableCell>
                      <TableCell align="right">{formatCurrency(p.pipeline.createdValue)}</TableCell>
                      <TableCell align="right">{formatCurrency(p.pipeline.wonValue)}</TableCell>
                      <TableCell align="right">{p.pipeline.leadsCreated}</TableCell>
                      <TableCell align="right">{p.pipeline.visitsLogged}</TableCell>
                      <TableCell align="right">{withTarget.length ? `${met}/${withTarget.length}` : '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <Typography variant="caption" color="text.secondary">Click a person for their detail.</Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Team KPIs</Typography>
          {c.kpis.length === 0 ? <Typography variant="body2" color="text.secondary">No KPIs configured.</Typography> : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>KPI</TableCell><TableCell align="right">Staff</TableCell><TableCell align="right">Reported</TableCell><TableCell align="right">Target</TableCell><TableCell sx={{ minWidth: 150 }}>% of target</TableCell></TableRow></TableHead>
                <TableBody>
                  {c.kpis.map((k: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{k.name}<Typography variant="caption" color="text.secondary" display="block">{k.frequency}</Typography></TableCell>
                      <TableCell align="right">{k.staff}</TableCell>
                      <TableCell align="right">{fmtVal(k.total, k.unit)}</TableCell>
                      <TableCell align="right">{k.target === null ? '-' : fmtVal(k.target, k.unit)}</TableCell>
                      <TableCell>{k.pct === null ? '-' : <Box><Typography variant="caption">{k.pct}%</Typography><LinearProgress variant="determinate" value={Math.min(100, k.pct)} color={pctColor(k.pct) as any} /></Box>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Monthly projections vs actual (team)</Typography>
          <ProjectionTable rows={c.projections} showStaff />
        </CardContent>
      </Card>
    </>
  );
}

function Individual({ p, showDaily, workdays, today }: { p: any; showDaily: boolean; workdays: string[]; today: string }) {
  const c = p.compliance;
  const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <>
      <Typography variant="h5" sx={{ mb: 1 }}>{p.name}</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Stat label="Reporting compliance" value={c.pct === null ? 'n/a' : `${c.pct}%`} sub={`${c.reportedDays} of ${c.dueDays} working days`} color={`${pctColor(c.pct)}.main`} />
      </Grid>
      {c.missedDates.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>No KPI report on: {c.missedDates.map(dayLabel).join(', ')}</Alert>}
      {c.todayPending && <Alert severity="warning" sx={{ mb: 2 }}>Has not reported today yet.</Alert>}
      <PipelineStats pl={p.pipeline} />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>KPIs</Typography>
          {p.kpis.length === 0 ? <Typography variant="body2" color="text.secondary">No KPIs assigned.</Typography> : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>KPI</TableCell>
                    {showDaily && workdays.map((d) => <TableCell key={d} align="right" sx={{ whiteSpace: 'nowrap' }}>{dayLabel(d)}{d === today ? ' •' : ''}</TableCell>)}
                    <TableCell align="right">Total</TableCell><TableCell align="right">Target</TableCell><TableCell>%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {p.kpis.map((k: any) => (
                    <TableRow key={k.kpiId}>
                      <TableCell>{k.name}<Typography variant="caption" color="text.secondary" display="block">{k.frequency}</Typography></TableCell>
                      {showDaily && workdays.map((d) => <TableCell key={d} align="right">{k.daily[d] === undefined ? <Typography variant="body2" color="text.disabled">·</Typography> : k.daily[d]}</TableCell>)}
                      <TableCell align="right">{fmtVal(k.total, k.unit)}</TableCell>
                      <TableCell align="right">{k.target === null ? '-' : fmtVal(k.target, k.unit)}</TableCell>
                      <TableCell>{k.pct === null ? '-' : <Typography variant="body2" fontWeight={700} color={`${pctColor(k.pct)}.main`}>{k.pct}%</Typography>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {p.kpis.some((k: any) => k.answers.length > 0) && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Answers &amp; prospects discussed</Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>Date</TableCell><TableCell>KPI</TableCell><TableCell>Prospect</TableCell><TableCell>Answer</TableCell></TableRow></TableHead>
              <TableBody>
                {p.kpis.flatMap((k: any) => k.answers.map((a: any, i: number) => ({ ...a, kpi: k.name, key: `${k.kpiId}${i}` })))
                  .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
                  .map((a: any) => (
                    <TableRow key={a.key}><TableCell>{a.date}</TableCell><TableCell>{a.kpi}</TableCell><TableCell>{a.prospect || '-'}</TableCell><TableCell>{a.text || (a.value !== null ? a.value : '-')}</TableCell></TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Monthly projections vs actual</Typography>
          <ProjectionTable rows={p.projections} />
        </CardContent>
      </Card>
    </>
  );
}
