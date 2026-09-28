import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

// Admin-only data-correction tool. Not part of the normal navigation flow -
// exists purely to backfill createdAt / forecastedCloseDate / closedAt on
// opportunities where imported or historical data left them missing or
// wrong. See backend opportunity.service.ts#adminUpdateDates.

// Local YYYY-MM-DD for a <input type="date">, and full ISO for a
// <input type="datetime-local"> (its value has no trailing "Z").
const toDateInput = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : '');
const toDateTimeInput = (v: any) => (v ? new Date(v).toISOString().slice(0, 16) : '');

export default function FixOpportunityDatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'Admin';

  const [search, setSearch] = React.useState('');
  const [rows, setRows] = React.useState<any[]>([]);
  const [edits, setEdits] = React.useState<Record<string, { createdAt: string; forecastedCloseDate: string; closedAt: string }>>({});
  const [loading, setLoading] = React.useState(false);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, limit: 200 };
      if (search) params.search = search;
      const res = await api.getOpportunities(1, 200, params);
      const data = res.data.data || [];
      setRows(data);
      const nextEdits: typeof edits = {};
      data.forEach((r: any) => {
        nextEdits[r.id] = {
          createdAt: toDateTimeInput(r.createdAt),
          forecastedCloseDate: toDateInput(r.forecastedCloseDate),
          closedAt: toDateTimeInput(r.closedAt),
        };
      });
      setEdits(nextEdits);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to load opportunities' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setField = (id: string, field: 'createdAt' | 'forecastedCloseDate' | 'closedAt', value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const save = async (id: string) => {
    const e = edits[id];
    if (!e) return;
    setSavingId(id);
    setMessage(null);
    try {
      await api.adminUpdateOpportunityDates(id, {
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : undefined,
        forecastedCloseDate: e.forecastedCloseDate ? new Date(e.forecastedCloseDate).toISOString() : undefined,
        closedAt: e.closedAt ? new Date(e.closedAt).toISOString() : null,
      });
      setMessage({ type: 'success', text: 'Dates updated.' });
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update dates' });
    } finally {
      setSavingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <Alert severity="error">This page is restricted to Admin users.</Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>Fix Opportunity Dates</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Admin-only tool to backfill or correct the Created, Forecasted Close, and Closed dates on
          existing opportunities (e.g. records where an import left these missing or wrong). Changes
          here bypass normal validation, so double-check before saving.
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              size="small"
              label="Search by opportunity name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 280 }}
            />
            <Button variant="contained" onClick={load} disabled={loading}>
              {loading ? 'Loading...' : 'Search'}
            </Button>
          </Stack>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Forecasted Close</TableCell>
                <TableCell>Closed At</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const e = edits[r.id] || { createdAt: '', forecastedCloseDate: '', closedAt: '' };
                const isClosed = r.stage === 'Closed-Won' || r.stage === 'Closed-Lost';
                return (
                  <TableRow key={r.id}>
                    <TableCell sx={{ maxWidth: 200 }}>{r.name}</TableCell>
                    <TableCell>{r.account?.name || r.company || '-'}</TableCell>
                    <TableCell><Chip label={r.stage} size="small" /></TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="datetime-local"
                        value={e.createdAt}
                        onChange={(ev) => setField(r.id, 'createdAt', ev.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        value={e.forecastedCloseDate}
                        onChange={(ev) => setField(r.id, 'forecastedCloseDate', ev.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="datetime-local"
                        value={e.closedAt}
                        onChange={(ev) => setField(r.id, 'closedAt', ev.target.value)}
                        InputLabelProps={{ shrink: true }}
                        disabled={!isClosed}
                        helperText={!isClosed ? 'Only for Closed stages' : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => save(r.id)}
                        disabled={savingId === r.id}
                      >
                        {savingId === r.id ? 'Saving...' : 'Save'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={7} align="center">No opportunities found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Showing up to 200 results at a time. Narrow with search if the opportunity you need isn't listed.
        </Typography>
      </Box>
    </Layout>
  );
}
