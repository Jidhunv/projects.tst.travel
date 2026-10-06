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
import { Button, MenuItem, Paper, Stack, TablePagination, TextField } from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency } from '@utils/format';
import { exportToCsv } from '@utils/exportCsv';
import useAuth from '@hooks/useAuth';
import { usePagedReport } from '@hooks/usePagedReport';

export default function ReportsPage() {
  const { user } = useAuth();
  const [mis, setMis] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Combined report (Leads + Accounts + Opportunities) with shared filters.
  const [cFilters, setCFilters] = React.useState({ search: '', region: '', country: '', fromDate: '', toDate: '', ownerId: '' });
  const [owners, setOwners] = React.useState<any[]>([]);

  // Shared filter params; non-admins are pinned to their own records, admins may pick an owner.
  const params = React.useMemo(() => {
    const p: Record<string, string> = {};
    Object.entries(cFilters).forEach(([k, v]) => { if (v && k !== 'ownerId') p[k] = v; });
    if (user?.role?.name !== 'Admin') {
      if (user?.id) p.ownerId = user.id;
    } else if (cFilters.ownerId) {
      p.ownerId = cFilters.ownerId;
    }
    return p;
  }, [cFilters, user?.id, user?.role]);
  const filterKey = JSON.stringify(params);

  const leadsR = usePagedReport<any>((pg, lim) => api.getLeads(pg, lim, params), filterKey);
  const accountsR = usePagedReport<any>((pg, lim) => api.getAccounts(pg, lim, params), filterKey);
  const oppsR = usePagedReport<any>((pg, lim) => api.getOpportunities(pg, lim, params), filterKey);
  const timelineR = usePagedReport<any>((pg, lim) => api.getConversionTimeline({ ...params, page: pg, limit: lim }), filterKey);

  React.useEffect(() => {
    Promise.all([
      api.getMIS(),
      user?.role?.name === 'Admin' ? api.getUsers(1, 500) : Promise.resolve({ data: { data: [] } })
    ])
      .then(([misRes, usersRes]) => {
        if (misRes.data.success) setMis(misRes.data.data);
        if (usersRes?.data?.data) {
          setOwners(usersRes.data.data);
        }
      })
      .catch(() => setError('Failed to load report data'))
      .finally(() => setLoading(false));
  }, [user?.role]);

  const exportLeads = async () => exportToCsv('leads-report', [
    { header: 'Name', value: (r: any) => `${r.firstName} ${r.lastName}` },
    { header: 'Email', value: (r: any) => r.email },
    { header: 'Company', value: (r: any) => r.account?.name || r.company || '' },
    { header: 'Business Volume', value: (r: any) => r.businessVolume },
    { header: 'Suppliers', value: (r: any) => r.supplierList },
    { header: 'Region', value: (r: any) => r.region },
    { header: 'Country', value: (r: any) => r.country },
    { header: 'Status', value: (r: any) => r.status },
    { header: 'Value', value: (r: any) => r.value },
    { header: 'Owner', value: (r: any) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '' },
  ], await leadsR.fetchAllRows());

  const exportAccounts = async () => exportToCsv('accounts-report', [
    { header: 'Name', value: (r: any) => r.name },
    { header: 'Contact Person', value: (r: any) => r.contactPerson },
    { header: 'Industry', value: (r: any) => r.industry },
    { header: 'City', value: (r: any) => r.city },
    { header: 'Region', value: (r: any) => r.region },
    { header: 'Country', value: (r: any) => r.country },
    { header: 'Type', value: (r: any) => r.type },
    { header: 'Phone', value: (r: any) => r.phoneNumber },
    { header: 'Owner', value: (r: any) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '' },
  ], await accountsR.fetchAllRows());

  const exportOpps = async () => exportToCsv('opportunities-report', [
    { header: 'Name', value: (r: any) => r.name },
    { header: 'Company', value: (r: any) => r.account?.name || r.company || '' },
    { header: 'Amount', value: (r: any) => r.amount },
    { header: 'Business Volume', value: (r: any) => r.businessVolume },
    { header: 'Stage', value: (r: any) => r.stage },
    { header: 'Status', value: (r: any) => r.status },
    { header: 'Region', value: (r: any) => r.region },
    { header: 'Country', value: (r: any) => r.country },
    { header: 'Owner', value: (r: any) => r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '' },
  ], await oppsR.fetchAllRows());

  const fmtDateTime = (v: any) => v ? new Date(v).toLocaleString() : '-';

  const exportTimeline = async () => exportToCsv('conversion-timeline-report', [
    { header: 'Account', value: (r: any) => r.accountName },
    { header: 'Account Created', value: (r: any) => r.accountCreatedAt ? new Date(r.accountCreatedAt).toLocaleString() : '' },
    { header: 'Account Owner', value: (r: any) => r.accountOwner },
    { header: 'Lead', value: (r: any) => r.leadName || '' },
    { header: 'Lead Created', value: (r: any) => r.leadCreatedAt ? new Date(r.leadCreatedAt).toLocaleString() : '' },
    { header: 'Lead Status', value: (r: any) => r.leadStatus || '' },
    { header: 'Lead Converted At', value: (r: any) => r.leadConvertedAt ? new Date(r.leadConvertedAt).toLocaleString() : '' },
    { header: 'Opportunity', value: (r: any) => r.opportunityName || '' },
    { header: 'Converted to Opportunity At', value: (r: any) => r.opportunityCreatedAt ? new Date(r.opportunityCreatedAt).toLocaleString() : '' },
    { header: 'Opportunity Stage', value: (r: any) => r.opportunityStage || '' },
    { header: 'Opportunity Status', value: (r: any) => r.opportunityStatus || '' },
  ], await timelineR.fetchAllRows());

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
          {user?.role?.name === 'Admin' && (
            <TextField
              size="small"
              select
              label="Owner"
              sx={{ minWidth: 180 }}
              value={cFilters.ownerId}
              onChange={(e) => setCFilters({ ...cFilters, ownerId: e.target.value })}
            >
              <MenuItem value="">All Owners</MenuItem>
              {owners.map((owner) => (
                <MenuItem key={owner.id} value={owner.id}>
                  {owner.firstName} {owner.lastName}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField size="small" label="Region" value={cFilters.region} onChange={(e) => setCFilters({ ...cFilters, region: e.target.value })} />
          <TextField size="small" label="Country" value={cFilters.country} onChange={(e) => setCFilters({ ...cFilters, country: e.target.value })} />
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={cFilters.fromDate} onChange={(e) => setCFilters({ ...cFilters, fromDate: e.target.value })} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={cFilters.toDate} onChange={(e) => setCFilters({ ...cFilters, toDate: e.target.value })} />
          <Button onClick={() => setCFilters({ search: '', region: '', country: '', fromDate: '', toDate: '', ownerId: '' })}>Clear</Button>
        </Stack>
      </Paper>

      <ReportBlock title="Leads" paged={leadsR} onExport={exportLeads}
        head={['Name', 'Company', 'Business Volume', 'Region', 'Country', 'Status', 'Owner']}
        rows={leadsR.rows.map((r) => [`${r.firstName} ${r.lastName}`, r.account?.name || r.company || '-', r.businessVolume ?? '-', r.region || '-', r.country || '-', r.status, r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '-'])} />

      <ReportBlock title="Accounts" paged={accountsR} onExport={exportAccounts}
        head={['Name', 'Contact Person', 'City', 'Region', 'Country', 'Type', 'Owner']}
        rows={accountsR.rows.map((r) => [r.name, r.contactPerson || '-', r.city || '-', r.region || '-', r.country || '-', r.type, r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '-'])} />

      <ReportBlock title="Opportunities" paged={oppsR} onExport={exportOpps}
        head={['Name', 'Company', 'Amount', 'Stage', 'Status', 'Region', 'Owner']}
        rows={oppsR.rows.map((r) => [r.name, r.account?.name || r.company || '-', formatCurrency(r.amount), r.stage, r.status, r.region || '-', r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '-'])} />

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Conversion Timeline</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Account created &rarr; Lead added &rarr; Lead converted to Opportunity, with a timestamp at each stage.
      </Typography>
      <ReportBlock title="Timeline" paged={timelineR} onExport={exportTimeline}
        head={['Account', 'Account Created', 'Lead', 'Lead Created', 'Lead Converted', 'Opportunity', 'Converted to Opportunity', 'Stage']}
        rows={timelineR.rows.map((r: any) => [
          r.accountName,
          fmtDateTime(r.accountCreatedAt),
          r.leadName || '-',
          fmtDateTime(r.leadCreatedAt),
          fmtDateTime(r.leadConvertedAt),
          r.opportunityName || '-',
          fmtDateTime(r.opportunityCreatedAt),
          r.opportunityStage || '-',
        ])} />
    </Layout>
  );
}

function ReportBlock({ title, head, rows, onExport, paged }: {
  title: string;
  head: string[];
  rows: any[][];
  onExport: () => Promise<void>;
  paged: { total: number; page: number; limit: number; loading: boolean; error: string; setPage: (p: number) => void; setLimit: (l: number) => void };
}) {
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState('');
  const runExport = async () => {
    setExporting(true);
    setExportError('');
    try { await onExport(); } catch (e: any) { setExportError(e?.message || 'Export failed'); } finally { setExporting(false); }
  };
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">{title} ({paged.total})</Typography>
          <Button size="small" variant="outlined" onClick={runExport} disabled={exporting || paged.total === 0}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </Box>
        {paged.error && <Alert severity="error" sx={{ mb: 1 }}>{paged.error}</Alert>}
        {exportError && <Alert severity="error" sx={{ mb: 1 }}>{exportError}</Alert>}
        <Box sx={{ overflowX: 'auto', opacity: paged.loading ? 0.5 : 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>{head.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>{row.map((c, j) => <TableCell key={j}>{c as any}</TableCell>)}</TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={head.length} align="center">
                    {paged.loading ? 'Loading…' : paged.error ? 'Could not load records' : 'No records match these filters'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={paged.total}
          page={paged.page}
          rowsPerPage={paged.limit}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_, p) => paged.setPage(p)}
          onRowsPerPageChange={(e) => paged.setLimit(parseInt(e.target.value, 10))}
        />
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
      <Box sx={{ p: 1.5, borderLeft: `4px solid ${color}`, bgcolor: 'action.hover', borderRadius: 1 }}>
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
