import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tab, Tabs, TextField, Typography,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

const CATEGORIES = [
  { key: 'businessType', label: 'Business types', help: 'Retail, B2B, Corporate, or any other business type a prospect can have.' },
  { key: 'employeeBand', label: 'Number of employees', help: 'Employee bands offered in the prospecting questionnaire.' },
];

// Prospect options master: the choices offered in the Prospecting questionnaire.
// Options that are deactivated stay readable on existing prospects.
export const ProspectOptionsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('prospect_options', 'create');
  const canUpdate = hasPermission('prospect_options', 'update');

  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [rows, setRows] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.getProspectOptions(category);
      setRows(res.data.data || []);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not load prospect options');
    }
  };

  useEffect(() => { load(); }, [category]);

  const add = async () => {
    if (!newName.trim()) return;
    try {
      await api.createProspectOption({ category, name: newName.trim() });
      setNewName('');
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not add the option');
    }
  };

  const toggle = async (row: any) => {
    try {
      await api.updateProspectOption(row.id, { isActive: !row.isActive });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not change the option');
    }
  };

  const rename = async (row: any) => {
    const name = window.prompt('New name for this option', row.name);
    if (!name || !name.trim() || name.trim() === row.name) return;
    try {
      await api.updateProspectOption(row.id, { name: name.trim() });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not rename the option');
    }
  };

  const current = CATEGORIES.find((c) => c.key === category)!;

  return (
    <Layout>
      <Typography variant="h4" sx={{ mb: 1 }}>Lead Options</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{current.help}</Typography>

      <Tabs value={category} onChange={(_, v) => setCategory(v)} sx={{ mb: 2 }}>
        {CATEGORIES.map((c) => <Tab key={c.key} value={c.key} label={c.label} />)}
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {canCreate && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField size="small" label="New option" value={newName} onChange={(e) => setNewName(e.target.value)} sx={{ minWidth: 280 }} />
          <Button variant="contained" onClick={add} disabled={!newName.trim()}>Add</Button>
        </Stack>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Option</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell><Chip size="small" label={r.isActive ? 'Active' : 'Inactive'} color={r.isActive ? 'success' : 'default'} /></TableCell>
                <TableCell align="right">
                  {canUpdate && (
                    <>
                      <Button size="small" onClick={() => rename(r)}>Rename</Button>
                      <Button size="small" onClick={() => toggle(r)}>{r.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center">No options yet. Add one above.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 2 }} />
    </Layout>
  );
};

export default ProspectOptionsPage;
