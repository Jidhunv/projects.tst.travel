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
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency } from '@utils/format';

export default function ReportsPage() {
  const [mis, setMis] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    api
      .getMIS()
      .then((res) => {
        if (res.data.success) setMis(res.data.data);
      })
      .catch(() => setError('Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

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
    </Layout>
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
