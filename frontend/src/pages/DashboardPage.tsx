import React from 'react';
import { Box, Card, CardContent, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import { formatCurrency, formatCurrencyCompact } from '@utils/format';

export default function DashboardPage() {
  const [mis, setMis] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    api
      .getMIS()
      .then((res) => {
        if (res.data.success) setMis(res.data.data);
      })
      .catch(() => setError('Failed to load dashboard data'))
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

  const cards = [
    {
      title: 'Open Pipeline',
      value: formatCurrencyCompact(mis.pipeline.totalOpenValue),
      sub: `${mis.pipeline.openCount} open deals`,
      color: '#6366f1',
    },
    {
      title: 'Weighted Forecast',
      value: formatCurrencyCompact(mis.pipeline.totalWeightedValue),
      sub: 'Probability-adjusted',
      color: '#0ea5e9',
    },
    {
      title: 'Won Revenue',
      value: formatCurrencyCompact(mis.sales.wonValue),
      sub: `${mis.sales.wonCount} deals won`,
      color: '#10b981',
    },
    {
      title: 'Win Rate',
      value: `${mis.sales.winRate}%`,
      sub: `${mis.sales.lostCount} lost`,
      color: '#f59e0b',
    },
  ];

  return (
    <Layout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {/* Headline KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderLeft: `4px solid ${c.color}` }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  {c.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {c.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {c.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {/* Pipeline by stage */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipeline by Stage
              </Typography>
              {mis.pipeline.byStage.map((s: any) => {
                const pct =
                  mis.pipeline.totalOpenValue > 0
                    ? (s.totalValue / mis.pipeline.totalOpenValue) * 100
                    : 0;
                return (
                  <Box key={s.stage} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        {s.stage} ({s.count})
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(s.totalValue)}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 8, bgcolor: '#eef2ff', borderRadius: 1 }}>
                      <Box
                        sx={{
                          height: 8,
                          width: `${pct}%`,
                          bgcolor: '#6366f1',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* This period + conversion */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Closed Won
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="textSecondary">This Month</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {formatCurrency(mis.wonThisMonth.value)} ({mis.wonThisMonth.count})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="textSecondary">This Quarter</Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {formatCurrency(mis.wonThisQuarter.value)} ({mis.wonThisQuarter.count})
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leads
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="textSecondary">Total</Typography>
                <Typography sx={{ fontWeight: 600 }}>{mis.leads.total}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="textSecondary">Conversion Rate</Typography>
                <Typography sx={{ fontWeight: 600 }}>{mis.leads.conversionRate}%</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
}
