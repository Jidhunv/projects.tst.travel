import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Button, Paper, Stack, TextField } from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency } from '@utils/format';
import { exportToCsv } from '@utils/exportCsv';

export default function ReportsPage() {
  const [mis, setMis] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Combined report (Leads + Accounts + Opportunities) with shared filters.
  const [cFilters, setCFilters] = React.useState({ search: '', region: '', country: '', fromDate: '', toDate: '' });
  const [leads, setLeads] = React.useState<any[]>([]);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [opps, setOpps] = React.useState<any[]>([]);

  const loadCombined = React.useCallback(async () => {
    const params: any = {};
    Object.entries(cFilters).forEach(([k, v]) => { if (v) params[k] = v; });
    const [l, a, o] = await Promise.all([
      api.getLeads(1, 500, params).catch(() => ({ data: { data: [] } })),
      api.getAccounts(1, 500, params).catch(() => ({ data: { data: [] } })),
      api.getOpportunities(1, 500, params).catch(() => ({ data: { data: [] } })),
    ]);
    setLeads(l.data.data || []);
    setAccounts(a.data.data || []);
    setOpps(o.data.data || []);
  }, [cFilters]);

  React.useEffect(() => {
    api
      .getMIS()
      .then((res) => {
        if (res.data.success) setMis(res.data.data);
      })
      .catch(() => setError('Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { loadCombined(); }, [loadCombined]);

  const exportLeads = () => exportToCsv('leads-report', [
    { header: 'Name', value: (r: any) => `${r.firstName} ${r.lastName}` },
    { header: 'Email', value: (r: any) => r.email },
    { header: 'Company', value: (r: any) => r.company },
    { header: 'Business Volume', value: (r: any) => r.businessVolume },
    { header: 'Suppliers', value: (r: any) => r.supplierList },
    { header: 'Region', value: (r: any) => r.region },
    { header: 'Country', value: (r: any) => r.country },
    { header: 'Status', value: (r: any) => r.status },
    { header: 'Value', value: (r: any) => r.value },
    { header: 'Owner', value: (r: any) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '' },
  ], leads);

  const exportAccounts = () => exportToCsv('accounts-report', [
    { header: 'Name', value: (r: any) => r.name },
    { header: 'Contact Person', value: (r: any) => r.contactPerson },
    { header: 'Industry', value: (r: any) => r.industry },
    { header: 'City', value: (r: any) => r.city },
    { header: 'Region', value: (r: any) => r.region },
    { header: 'Country', value: (r: any) => r.country },
    { header: 'Type', value: (r: any) => r.type },
    { header: 'Phone', value: (r: any) => r.phoneNumber },
  ], accounts);

  const exportOpps = () => exportToCsv('opportunities-report', [
    { header: 'Name', value: (r: any) => r.name },
    { header: 'Company', value: (r: any) => r.company || r.account?.name },
    { header: 'Amount', value: (r: any) => r.amount },
    { header: 'Business Volume', value: (r: any) => r.businessVolume },
    { header: 'Stage', value: (r: any) => r.stage },
    { header: 'Status', value: (r: any) => r.status },
    { header: 'Region', value: (r: any) => r.region },
    { header: 'Country', value: (r: any) => r.country },
    { header: 'Owner', value: (r: any) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '' },
  ], opps);

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !mis) {
    return (
      <Layout>
        <Alert severity="error">{error || 'No data available'}</Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Reports &amp; MIS
      </Typography>

      <Grid container spacing={2}>
        {/* Pipeline value by stage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipeline Value by Stage
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Stage</TableCell>
                    <TableCell align="right">Deals</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Weighted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mis.pipeline.byStage.map((s: any) => (
                    <TableRow key={s.stage}>
                      <TableCell>{s.stage}</TableCell>
                      <TableCell align="right">{s.count}</TableCell>
                      <TableCell align="right">{formatCurrency(s.totalValue)}</TableCell>
                      <TableCell align="right">{formatCurrency(s.weightedValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '2px solid #ddd' } }}>
                    <TableCell>Total</TableCell>
                    <TableCell align="right">{mis.pipeline.openCount}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(mis.pipeline.totalOpenValue)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(mis.pipeline.totalWeightedValue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Sales summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sales Summary
              </Typography>
              <Grid container spacing={2}>
                <SummaryCell label="Won Revenue" value={formatCurrency(mis.sales.wonValue)} sub={`${mis.sales.wonCount} deals`} color="#10b981" />
                <SummaryCell label="Lost Value" value={formatCurrency(mis.sales.lostValue)} sub={`${mis.sales.lostCount} deals`} color="#ef4444" />
                <SummaryCell label="Win Rate" value={`${mis.sales.winRate}%`} sub="Won / closed" color="#6366f1" />
                <SummaryCell label="Avg Deal Size" value={formatCurrency(mis.sales.avgDealSize)} sub="Won deals" color="#0ea5e9" />
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Loss reasons */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Loss Reasons
              </Typography>
              {mis.lossReasons.length === 0 ? (
                <Typography color="textSecondary" variant="body2">
                  No lost deals yet.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Deals</TableCell>
                      <TableCell align="right">Value Lost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mis.lossReasons.map((r: any) => (
                      <TableRow key={r.reason}>
                        <TableCell>
                          <Chip label={r.reason} size="small" />
                        </TableCell>
                        <TableCell align="right">{r.count}</TableCell>
                        <TableCell align="right">{formatCurrency(r.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sales by owner (managers/admin only) */}
        {mis.salesByOwner && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by Salesperson
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Salesperson</TableCell>
                      <TableCell align="right">Open</TableCell>
                      <TableCell align="right">Won</TableCell>
                      <TableCell align="right">Win %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mis.salesByOwner.map((o: any) => (
                      <TableRow key={o.ownerId}>
                        <TableCell>{o.ownerName}</TableCell>
                        <TableCell align="right">{formatCurrency(o.openValue)}</TableCell>
                        <TableCell align="right">{formatCurrency(o.wonValue)}</TableCell>
                        <TableCell align="right">{o.winRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* ---- Combined Report: Leads + Accounts + Opportunities ---- */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Combined Report</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="Search" value={cFilters.search} onChange={(e) => setCFilters({ ...cFilters, search: e.target.value })} />
          <TextField size="small" label="Region" value={cFilters.region} onChange={(e) => setCFilters({ ...cFilters, region: e.target.value })} />
          <TextField size="small" label="Country" value={cFilters.country} onChange={(e) => setCFilters({ ...cFilters, country: e.target.value })} />
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={cFilters.fromDate} onChange={(e) => setCFilters({ ...cFilters, fromDate: e.target.value })} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={cFilters.toDate} onChange={(e) => setCFilters({ ...cFilters, toDate: e.target.value })} />
          <Button onClick={() => setCFilters({ search: '', region: '', country: '', fromDate: '', toDate: '' })}>Clear</Button>
        </Stack>
      </Paper>

      <ReportBlock title={`Leads (${leads.length})`} onExport={exportLeads}
        head={['Name', 'Company', 'Business Volume', 'Region', 'Country', 'Status']}
        rows={leads.map((r) => [`${r.firstName} ${r.lastName}`, r.company || '-', r.businessVolume ?? '-', r.region || '-', r.country || '-', r.status])} />

      <ReportBlock title={`Accounts (${accounts.length})`} onExport={exportAccounts}
        head={['Name', 'Contact Person', 'City', 'Region', 'Country', 'Type']}
        rows={accounts.map((r) => [r.name, r.contactPerson || '-', r.city || '-', r.region || '-', r.country || '-', r.type])} />

      <ReportBlock title={`Opportunities (${opps.length})`} onExport={exportOpps}
        head={['Name', 'Company', 'Amount', 'Stage', 'Status', 'Region']}
        rows={opps.map((r) => [r.name, r.company || r.account?.name || '-', formatCurrency(r.amount), r.stage, r.status, r.region || '-'])} />
    </Layout>
  );
}

function ReportBlock({ title, head, rows, onExport }: { title: string; head: string[]; rows: any[][]; onExport: () => void }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <Button size="small" variant="outlined" onClick={onExport}>Export CSV</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>{head.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, 50).map((row, i) => (
              <TableRow key={i}>{row.map((c, j) => <TableCell key={j}>{c as any}</TableCell>)}</TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={head.length} align="center">No records</TableCell></TableRow>}
          </TableBody>
        </Table>
        {rows.length > 50 && <Typography variant="caption" color="textSecondary">Showing first 50 of {rows.length}. Use Export CSV for all.</Typography>}
      </CardContent>
    </Card>
  );
}

function SummaryCell({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Grid item xs={6}>
      <Box sx={{ p: 1.5, borderLeft: `4px solid ${color}`, bgcolor: '#fafafa', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {sub}
        </Typography>
      </Box>
    </Grid>
  );
}
