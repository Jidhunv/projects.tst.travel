import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Stack, Card, CardContent, InputAdornment, OutlinedInput,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

const empty = { code: '', name: '', region: '' };

export const CountriesPage: React.FC = () => {

  // The backend restricts creating countries to Admins.
  const { user } = useAuth();
  const canCreate = user?.role?.name === 'Admin';

  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const load = async (term?: string) => {
    setLoading(true);
    try {
      const res = await api.getCountries(term ? { search: term } : undefined);
      setRows(res.data.data || []);
      setError('');
    } catch (e: any) {
      console.error('Error loading countries:', e);
      setError(e.response?.data?.error || 'Could not load countries.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const save = async () => {
    try {
      await api.createCountry(form);
      setOpen(false);
      setForm(empty);
      load(search);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to add country');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Country Master</Typography>
          {canCreate && (
            <Button variant="contained" onClick={() => { setForm(empty); setOpen(true); }}>
              Add Country
            </Button>
          )}
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <OutlinedInput
              size="small"
              fullWidth
              placeholder="Search countries by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              }
            />
          </CardContent>
        </Card>

        {error && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography color="error">{error}</Typography>
              <Button size="small" onClick={() => load(search)} sx={{ mt: 1 }}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && rows.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="textSecondary">
                {search ? `No countries match "${search}".` : 'No countries found.'}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
              {rows.length} {rows.length === 1 ? 'country' : 'countries'}
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Region</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id || r.code}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{r.code}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{r.name}</TableCell>
                      <TableCell>{r.region || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Country</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Code"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                helperText="ISO country code, e.g. IN or AE"
                inputProps={{ maxLength: 3 }}
                fullWidth
              />
              <TextField
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
              />
              <TextField
                label="Region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                helperText="Optional, e.g. Asia or Middle East"
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={save}
              variant="contained"
              disabled={!form.code.trim() || !form.name.trim()}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default CountriesPage;
