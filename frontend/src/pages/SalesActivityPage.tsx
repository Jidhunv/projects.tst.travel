import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Grid, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency } from '@utils/format';
import { exportToCsv } from '@utils/exportCsv';
import { SortableHeaderCell, sortRows, SortState } from '@components/SortControl';

const STAGE_GETTERS: Record<string, (row: any) => unknown> = { stage: (r) => r.stage, count: (r) => r.count, value: (r) => r.value };
const PERSON_GETTERS: Record<string, (row: any) => unknown> = Object.fromEntries(
  ['name', 'leadsCreated', 'prospects', 'demosConducted', 'proposalsSent', 'reachedNegotiation', 'closedWon', 'closedLost', 'openDeals', 'pipelineValue', 'salesCalls', 'visits'].map((k) => [k, (r: any) => r[k]])
);

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const today = new Date();
const DEFAULT_FILTERS = {
  from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  to: toIsoDate(today),
  country: '',
  region: '',
  salespersonId: '',
};

// Sales activity KPIs. Counts are for events in the date range (for example, a deal that reached
// Negotiation in the range). Pipeline values are for deals created in the range.
export default function SalesActivityPage() {
  const [filters, setFilters] = React.useState(DEFAULT_FILTERS);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [options, setOptions] = React.useState<{ people: any[]; countries: string[]; regions: string[] }>({
    people: [],
    countries: [],
    regions: [],
  });
  const [optionsError, setOptionsError] = React.useState('');
  const [pipelineSort, setPipelineSort] = React.useState<SortState>({ sortBy: '', sortDir: 'asc' });
  const [personSort, setPersonSort] = React.useState<SortState>({ sortBy: '', sortDir: 'asc' });

  React.useEffect(() => {
    api.getSalesActivityOptions()
      .then((r) => setOptions({ people: r.data.data?.people || [], countries: r.data.data?.countries || [], regions: r.data.data?.regions || [] }))
      .catch((e: any) => setOptionsError(e.response?.data?.error || 'Could not load the filter lists'));
  }, []);

  React.useEffect(() => {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    setLoading(true);
    setError('');
    api.getSalesActivitySummary(params)
      .then((r) => setData(r.data.data))
      .catch((e: any) => {
        setData(null);
        setError(e.response?.data?.error || 'Could not load sales activity');
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const totals = data?.totals;
  const cards = totals
    ? [
        { label: 'Leads created', value: totals.leadsCreated },
        { label: 'Prospects', value: totals.prospects },
        { label: 'Demos conducted', value: totals.demosConducted },
        { label: 'Proposals sent', value: totals.proposalsSent },
        { label: 'Reached negotiation', value: totals.reachedNegotiation },
        { label: 'Closed won', value: totals.closedWon },
        { label: 'Closed lost', value: totals.closedLost },
        { label: 'Sales calls', value: totals.salesCalls },
        { label: 'Visits and calls', value: totals.visits },
        { label: 'Open deals', value: totals.openDeals },
        { label: 'Open pipeline', value: formatCurrency(totals.pipelineValue) },
      ]
    : [];

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap spacing={2}>
          <Box>
            <Typography variant="h4">Sales KPIs</Typography>
            <Typography variant="body2" color="text.secondary">
              What each salesperson has done in the date range. You see the people your access allows.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            disabled={!data}
            onClick={() => exportToCsv('sales-activity', [
              { header: 'Salesperson', value: (p: any) => p.name },
              { header: 'Leads created', value: (p: any) => p.leadsCreated },
              { header: 'Prospects', value: (p: any) => p.prospects },
              { header: 'Demos conducted', value: (p: any) => p.demosConducted },
              { header: 'Proposals sent', value: (p: any) => p.proposalsSent },
              { header: 'Reached negotiation', value: (p: any) => p.reachedNegotiation },
              { header: 'Closed won', value: (p: any) => p.closedWon },
              { header: 'Closed lost', value: (p: any) => p.closedLost },
              { header: 'Open deals', value: (p: any) => p.openDeals },
              { header: 'Open pipeline value', value: (p: any) => p.pipelineValue },
              { header: 'Sales calls', value: (p: any) => p.salesCalls },
              { header: 'Visits and calls', value: (p: any) => p.visits },
            ], data?.byPerson || [])}
          >
            Export CSV
          </Button>
        </Stack>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            <TextField size="small" select sx={{ minWidth: 170 }} label="Country" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })}>
              <MenuItem value="">All countries</MenuItem>
              {options.countries.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField size="small" select sx={{ minWidth: 170 }} label="Region" value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })}>
              <MenuItem value="">All regions</MenuItem>
              {options.regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField
              size="small"
              select
              sx={{ minWidth: 200 }}
              label="Salesperson"
              value={filters.salespersonId}
              onChange={(e) => setFilters({ ...filters, salespersonId: e.target.value })}
              error={!!optionsError}
              helperText={optionsError || undefined}
            >
              <MenuItem value="">Everyone I can see</MenuItem>
              {options.people.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <Button onClick={() => setFilters(DEFAULT_FILTERS)}>This month</Button>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {data && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {cards.map((c) => (
                <Grid item xs={6} sm={4} md={2} key={c.label}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                      <Typography variant="h5">{c.value}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h6" gutterBottom>Pipeline value by stage</Typography>
            <Paper sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <SortableHeaderCell label="Stage" sortKey="stage" sort={pipelineSort} onSort={setPipelineSort} />
                    <SortableHeaderCell label="Deals" sortKey="count" align="right" sort={pipelineSort} onSort={setPipelineSort} />
                    <SortableHeaderCell label="Value" sortKey="value" align="right" sort={pipelineSort} onSort={setPipelineSort} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortRows(data.pipelineByStage, pipelineSort, STAGE_GETTERS).map((s: any) => (
                    <TableRow key={s.stage}>
                      <TableCell>{s.stage}</TableCell>
                      <TableCell align="right">{s.count}</TableCell>
                      <TableCell align="right">{formatCurrency(s.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Typography variant="h6" gutterBottom>By salesperson</Typography>
            {data.byPerson.length === 0 ? (
              <Alert severity="info">No sales activity matches these filters in the date range.</Alert>
            ) : (
              <Paper sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <SortableHeaderCell label="Salesperson" sortKey="name" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Leads" sortKey="leadsCreated" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Prospects" sortKey="prospects" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Demos" sortKey="demosConducted" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Proposals" sortKey="proposalsSent" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Negotiation" sortKey="reachedNegotiation" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Won" sortKey="closedWon" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Lost" sortKey="closedLost" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Open deals" sortKey="openDeals" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Open pipeline" sortKey="pipelineValue" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Calls" sortKey="salesCalls" align="right" sort={personSort} onSort={setPersonSort} />
                      <SortableHeaderCell label="Visits" sortKey="visits" align="right" sort={personSort} onSort={setPersonSort} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortRows(data.byPerson, personSort, PERSON_GETTERS).map((p: any) => (
                      <TableRow key={p.ownerId || 'unassigned'} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                        <TableCell align="right">{p.leadsCreated}</TableCell>
                        <TableCell align="right">{p.prospects}</TableCell>
                        <TableCell align="right">{p.demosConducted}</TableCell>
                        <TableCell align="right">{p.proposalsSent}</TableCell>
                        <TableCell align="right">{p.reachedNegotiation}</TableCell>
                        <TableCell align="right">{p.closedWon}</TableCell>
                        <TableCell align="right">{p.closedLost}</TableCell>
                        <TableCell align="right">{p.openDeals}</TableCell>
                        <TableCell align="right">{formatCurrency(p.pipelineValue)}</TableCell>
                        <TableCell align="right">{p.salesCalls}</TableCell>
                        <TableCell align="right">{p.visits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Prospects, demos and proposals are counted from the history recorded in this system. Records made before
              that history was kept are not counted. A demo is counted each time a deal moves into Demonstration; a proposal when
              it is recorded as sent.
            </Typography>
          </>
        )}
      </Box>
    </Layout>
  );
}
