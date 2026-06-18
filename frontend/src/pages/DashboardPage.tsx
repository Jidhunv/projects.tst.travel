import React from 'react';
import { Box, Card, CardContent, Grid, Typography, CircularProgress } from '@mui/material';
import Layout from '@components/Layout';

interface Stats {
  openLeads: number;
  openOpportunities: number;
  totalAccounts: number;
  pipelineValue: number;
  closedWonThisMonth: number;
  conversionRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState<Stats>({
    openLeads: 24,
    openOpportunities: 12,
    totalAccounts: 45,
    pipelineValue: 250000,
    closedWonThisMonth: 5,
    conversionRate: 42,
  });

  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // TODO: Fetch dashboard data from API
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Open Leads',
      value: stats.openLeads,
      color: '#3b82f6',
    },
    {
      title: 'Open Opportunities',
      value: stats.openOpportunities,
      color: '#10b981',
    },
    {
      title: 'Total Accounts',
      value: stats.totalAccounts,
      color: '#f59e0b',
    },
    {
      title: 'Pipeline Value',
      value: `$${(stats.pipelineValue / 1000).toFixed(0)}K`,
      color: '#8b5cf6',
    },
  ];

  return (
    <Layout>
      <Box>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Dashboard
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  borderLeft: `4px solid ${stat.color}`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {stat.title}
                  </Typography>
                  <Typography variant="h5">{stat.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Performance Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Closed Won (This Month)
                </Typography>
                <Typography variant="h5">{stats.closedWonThisMonth}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Deals successfully closed
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Conversion Rate
                </Typography>
                <Typography variant="h5">{stats.conversionRate}%</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Lead to opportunity conversion
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}
