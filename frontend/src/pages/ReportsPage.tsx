import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import Layout from '@components/Layout';
import { SortableHeaderCell, sortRows, SortState } from '@components/SortControl';
import ReportFilterBar, {
  EMPTY_REPORT_FILTERS,
  ReportFilterField,
  ReportFilters,
  reportParams,
  useReportOptions,
} from '@components/ReportFilterBar';
import { api } from '@services/api';
import { formatCurrency } from '@utils/format';
import { exportToCsv } from '@utils/exportCsv';
import useAuth from '@hooks/useAuth';
import { usePagedReport } from '@hooks/usePagedReport';

const PIPELINE_GETTERS: Record<string, (row: any) => unknown> = { stage: (s) => s.stage, count: (s) => s.count, totalValue: (s) => s.totalValue, weightedValue: (s) => s.weightedValue };
const LOSS_GETTERS: Record<string, (row: any) => unknown> = { reason: (r) => r.reason, count: (r) => r.count, value: (r) => r.value };
const PERF_GETTERS: Record<string, (row: any) => unknown> = { name: (o) => o.ownerName, open: (o) => o.openValue, won: (o) => o.wonValue, winRate: (o) => o.winRate };
const SUMMARY_FIELDS: ReportFilterField[] = ['dates', 'salesperson', 'country', 'region'];
const LIST_FIELDS: ReportFilterField[] = ['search', 'dates', 'salesperson', 'country', 'region'];

// Loads the summary (MIS) figures for one card's filters. Each card asks for its own set.
function useSummary(filters: ReportFilters) {
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const key = JSON.stringify(reportParams(filters));
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.getMIS(reportParams(filters))
      .then((r) => { if (active) setData(r.data.data); })
      .catch((e: any) => { if (active) setError(e.response?.data?.error || 'Could not load this report'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, error, loading };
}

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  const { options, error: optionsError } = useReportOptions();

  const [pipelineFilters, setPipelineFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [salesFilters, setSalesFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [lossFilters, setLossFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [performanceFilters, setPerformanceFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [prospectFilters, setProspectFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [accountFilters, setAccountFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [oppFilters, setOppFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [timelineFilters, setTimelineFilters] = React.useState<ReportFilters>(EMPTY_REPORT_FILTERS);

  const pipelineS = useSummary(pipelineFilters);
  const salesS = useSummary(salesFilters);
  const lossS = useSummary(lossFilters);
  const performanceS = useSummary(performanceFilters);

  const [prospectSort, setProspectSort] = React.useState<SortState>({ sortBy: 'createdAt', sortDir: 'desc' });
  const [accountSort, setAccountSort] = React.useState<SortState>({ sortBy: 'createdAt', sortDir: 'desc' });
  const [oppSort, setOppSort] = React.useState<SortState>({ sortBy: 'closeDate', sortDir: 'asc' });
  const [timelineSort, setTimelineSort] = React.useState<SortState>({ sortBy: 'accountCreated', sortDir: 'desc' });
  const [pipelineSort, setPipelineSort] = React.useState<SortState>({ sortBy: '', sortDir: 'asc' });
  const [lossSort, setLossSort] = React.useState<SortState>({ sortBy: '', sortDir: 'asc' });
  const [perfSort, setPerfSort] = React.useState<SortState>({ sortBy: '', sortDir: 'asc' });
  const prospectParams = { ...reportParams(prospectFilters), sortBy: prospectSort.sortBy, sortDir: prospectSort.sortDir };
  const accountParams = { ...reportParams(accountFilters), sortBy: accountSort.sortBy, sortDir: accountSort.sortDir };
  const oppParams = { ...reportParams(oppFilters), sortBy: oppSort.sortBy, sortDir: oppSort.sortDir };
  const timelineParams = { ...reportParams(timelineFilters), sortBy: timelineSort.sortBy, sortDir: timelineSort.sortDir };
  const leadsR = usePagedReport<any>((pg, lim) => api.getLeads(pg, lim, prospectParams), JSON.stringify(prospectParams));
  const accountsR = usePagedReport<any>((pg, lim) => api.getAccounts(pg, lim, accountParams), JSON.stringify(accountParams));
  const oppsR = usePagedReport<any>((pg, lim) => api.getOpportunities(pg, lim, oppParams), JSON.stringify(oppParams));
  const timelineR = usePagedReport<any>((pg, lim) => api.getConversionTimeline({ ...timelineParams, page: pg, limit: lim }), JSON.stringify(timelineParams));

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

  const cardError = (error: string) => error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>;

  return (
    <Layout>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Reports &amp; MIS
      </Typography>
      {optionsError && <Alert severity="warning" sx={{ mb: 2 }}>{optionsError}</Alert>}

      <Grid container spacing={2}>
        {/* Pipeline value by stage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipeline Value by Stage
              </Typography>
              <ReportFilterBar value={pipelineFilters} onChange={setPipelineFilters} options={options} fields={SUMMARY_FIELDS} />
              {cardError(pipelineS.error)}
              {pipelineS.loading && !pipelineS.data ? <CircularProgress size={24} /> : pipelineS.data && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <SortableHeaderCell label="Stage" sortKey="stage" sort={pipelineSort} onSort={setPipelineSort} />
                      <SortableHeaderCell label="Count" sortKey="count" align="right" sort={pipelineSort} onSort={setPipelineSort} />
                      <SortableHeaderCell label="Value" sortKey="totalValue" align="right" sort={pipelineSort} onSort={setPipelineSort} />
                      <SortableHeaderCell label="Weighted" sortKey="weightedValue" align="right" sort={pipelineSort} onSort={setPipelineSort} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortRows(pipelineS.data.pipeline.byStage, pipelineSort, PIPELINE_GETTERS).map((s: any) => (
                      <TableRow key={s.stage}>
                        <TableCell>{s.stage}</TableCell>
                        <TableCell align="right">{s.count}</TableCell>
                        <TableCell align="right">{formatCurrency(s.totalValue)}</TableCell>
                        <TableCell align="right">{s.weightedValue == null ? '–' : formatCurrency(s.weightedValue)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '2px solid #ddd' } }}>
                      <TableCell>Total</TableCell>
                      <TableCell align="right">{pipelineS.data.pipeline.openCount}</TableCell>
                      <TableCell align="right">{formatCurrency(pipelineS.data.pipeline.totalOpenValue)}</TableCell>
                      <TableCell align="right">{formatCurrency(pipelineS.data.pipeline.totalWeightedValue)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
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
              <ReportFilterBar value={salesFilters} onChange={setSalesFilters} options={options} fields={SUMMARY_FIELDS} />
              {cardError(salesS.error)}
              {salesS.loading && !salesS.data ? <CircularProgress size={24} /> : salesS.data && (
                <Grid container spacing={2}>
                  <SummaryCell label="Won Revenue" value={formatCurrency(salesS.data.sales.wonValue)} sub={`${salesS.data.sales.wonCount} deals`} color="#10b981" />
                  <SummaryCell label="Lost Value" value={formatCurrency(salesS.data.sales.lostValue)} sub={`${salesS.data.sales.lostCount} deals`} color="#ef4444" />
                  <SummaryCell label="Win Rate" value={`${salesS.data.sales.winRate}%`} sub="Won / closed" color="#6366f1" />
                  <SummaryCell label="Avg Deal Size" value={formatCurrency(salesS.data.sales.avgDealSize)} sub="Won deals" color="#0ea5e9" />
                </Grid>
              )}
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
              <ReportFilterBar value={lossFilters} onChange={setLossFilters} options={options} fields={SUMMARY_FIELDS} />
              {cardError(lossS.error)}
              {lossS.loading && !lossS.data ? <CircularProgress size={24} /> : lossS.data && (
                lossS.data.lossReasons.length === 0 ? (
                  <Typography color="textSecondary" variant="body2">
                    No lost deals for these filters.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <SortableHeaderCell label="Reason" sortKey="reason" sort={lossSort} onSort={setLossSort} />
                        <SortableHeaderCell label="Deals" sortKey="count" align="right" sort={lossSort} onSort={setLossSort} />
                        <SortableHeaderCell label="Value Lost" sortKey="value" align="right" sort={lossSort} onSort={setLossSort} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortRows(lossS.data.lossReasons, lossSort, LOSS_GETTERS).map((r: any) => (
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
                )
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance by salesperson (only when the viewer can see everyone) */}
        {performanceS.data?.salesByOwner && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by Salesperson
                </Typography>
                <ReportFilterBar value={performanceFilters} onChange={setPerformanceFilters} options={options} fields={SUMMARY_FIELDS} />
                {cardError(performanceS.error)}
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <SortableHeaderCell label="Salesperson" sortKey="name" sort={perfSort} onSort={setPerfSort} />
                      <SortableHeaderCell label="Open" sortKey="open" align="right" sort={perfSort} onSort={setPerfSort} />
                      <SortableHeaderCell label="Won" sortKey="won" align="right" sort={perfSort} onSort={setPerfSort} />
                      <SortableHeaderCell label="Win %" sortKey="winRate" align="right" sort={perfSort} onSort={setPerfSort} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortRows(performanceS.data.salesByOwner, perfSort, PERF_GETTERS).map((o: any) => (
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

      <ReportBlock title="Prospects" paged={leadsR} onExport={exportLeads} canExport={hasPermission('report_exports', 'leads')}
        filterBar={<ReportFilterBar value={prospectFilters} onChange={setProspectFilters} options={options} fields={LIST_FIELDS} />}
        head={['Name', 'Company', 'Business Volume', 'Region', 'Country', 'Status', 'Owner']}
        headKeys={['name', 'company', undefined, 'region', 'country', 'status', undefined]} sort={prospectSort} onSort={setProspectSort}
        rows={leadsR.rows.map((r) => [`${r.firstName} ${r.lastName}`, r.account?.name || r.company || '-', r.businessVolume ?? '-', r.region || '-', r.country || '-', r.status, r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '-'])} />

      <ReportBlock title="Accounts" paged={accountsR} onExport={exportAccounts} canExport={hasPermission('report_exports', 'accounts')}
        filterBar={<ReportFilterBar value={accountFilters} onChange={setAccountFilters} options={options} fields={LIST_FIELDS} />}
        head={['Name', 'Contact Person', 'City', 'Region', 'Country', 'Type', 'Owner']}
        headKeys={['name', undefined, undefined, 'region', 'country', 'type', 'owner']} sort={accountSort} onSort={setAccountSort}
        rows={accountsR.rows.map((r) => [r.name, r.contactPerson || '-', r.city || '-', r.region || '-', r.country || '-', r.type, r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '-'])} />

      <ReportBlock title="Opportunities" paged={oppsR} onExport={exportOpps} canExport={hasPermission('report_exports', 'opportunities')}
        filterBar={<ReportFilterBar value={oppFilters} onChange={setOppFilters} options={options} fields={LIST_FIELDS} />}
        head={['Name', 'Company', 'Amount', 'Stage', 'Status', 'Region', 'Owner']}
        headKeys={['name', undefined, 'amount', 'stage', 'status', 'region', undefined]} sort={oppSort} onSort={setOppSort}
        rows={oppsR.rows.map((r) => [r.name, r.account?.name || r.company || '-', formatCurrency(r.amount), r.stage, r.status, r.region || '-', r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '-'])} />

      <Typography variant="h5" sx={{ mt: 4, mb: 1 }}>Prospect Conversion Timeline</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Account created &rarr; Prospect added &rarr; Prospect converted to Opportunity, with a timestamp at each stage.
      </Typography>
      <ReportBlock title="Timeline" paged={timelineR} onExport={exportTimeline} canExport={hasPermission('report_exports', 'conversion_timeline')}
        filterBar={<ReportFilterBar value={timelineFilters} onChange={setTimelineFilters} options={options} fields={LIST_FIELDS} />}
        head={['Account', 'Account Created', 'Prospect', 'Prospect Created', 'Prospect Converted', 'Opportunity', 'Converted to Opportunity', 'Stage']}
        headKeys={['account', 'accountCreated', 'prospect', 'prospectCreated', 'prospectConverted', 'opportunity', 'opportunityCreated', 'stage']} sort={timelineSort} onSort={setTimelineSort}
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

function ReportBlock({ title, head, rows, onExport, canExport, paged, filterBar, headKeys, sort, onSort }: {
  title: string;
  head: string[];
  rows: any[][];
  onExport: () => Promise<void>;
  canExport: boolean;
  paged: { total: number; page: number; limit: number; loading: boolean; error: string; setPage: (p: number) => void; setLimit: (l: number) => void };
  filterBar: React.ReactNode;
  headKeys?: (string | undefined)[];
  sort?: SortState;
  onSort?: (next: SortState) => void;
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
          {canExport && (
            <Button size="small" variant="outlined" onClick={runExport} disabled={exporting || paged.total === 0}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
        </Box>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          {filterBar}
        </Paper>
        {paged.error && <Alert severity="error" sx={{ mb: 1 }}>{paged.error}</Alert>}
        {exportError && <Alert severity="error" sx={{ mb: 1 }}>{exportError}</Alert>}
        <Box sx={{ overflowX: 'auto', opacity: paged.loading ? 0.5 : 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>{head.map((h, i) => <SortableHeaderCell key={h} label={h} sortKey={headKeys?.[i]} sort={sort} onSort={onSort} />)}</TableRow>
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
