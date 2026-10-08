import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const fmtStamp = (v: any) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const blank = { name: '', description: '', type: 'number', unit: '', defaultFrequency: 'daily', defaultTarget: '', isActive: true, answerOptions: '' };
const TYPE_LABEL: Record<string, string> = { number: 'Number', yes_no: 'Yes / No', text: 'Text answer', choice: 'Choice (pick from a list)' };

// The approved list of KPI questions. Admin adds, edits, activates/deactivates and deletes them here;
// KPI Setup then assigns them to staff from a drop-down.
export default function KpiMasterPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('kpi_setup', 'create');
  const canEdit = hasPermission('kpi_setup', 'update');
  const canDelete = hasPermission('kpi_setup', 'delete');
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [dialog, setDialog] = React.useState<{ id?: string; inUse?: number; form: typeof blank } | null>(null);
  const [dialogError, setDialogError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setRows((await api.getKpiMaster()).data.data || []); setError(''); } catch (e) { setError(errMsg(e, 'Failed to load the KPI master')); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    setDialogError('');
    const f = dialog.form;
    const payload = { ...f, unit: f.unit || null, description: f.description || null, defaultTarget: f.defaultTarget === '' ? null : Number(f.defaultTarget), answerOptions: f.type === 'choice' ? f.answerOptions.split('\n').map((x: string) => x.trim()).filter(Boolean) : null };
    try {
      if (dialog.id) await api.updateKpiMaster(dialog.id, payload); else await api.createKpiMaster(payload);
      setDialog(null);
      await load();
    } catch (e) { setDialogError(errMsg(e, 'Could not save the question')); } finally { setSaving(false); }
  };

  const toggle = async (m: any) => {
    try { await api.updateKpiMaster(m.id, { isActive: !m.isActive }); await load(); } catch (e) { setError(errMsg(e, 'Could not change the status')); }
  };
  const remove = async (m: any) => {
    if (!window.confirm(`Delete "${m.name}" from the KPI master?`)) return;
    try { await api.deleteKpiMaster(m.id); await load(); } catch (e) { setError(errMsg(e, 'Could not delete the question')); }
  };
  const openEdit = (m: any) => {
    setDialogError('');
    setDialog({ id: m.id, inUse: m.assignedCount, form: { name: m.name, description: m.description || '', type: m.type, unit: m.unit || '', defaultFrequency: m.defaultFrequency, defaultTarget: m.defaultTarget === null ? '' : String(Number(m.defaultTarget)), isActive: m.isActive, answerOptions: (m.answerOptions || []).join('\n') } });
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4">KPI Master</Typography>
          <Typography variant="body2" color="text.secondary">The approved list of KPI questions. Staff KPIs are assigned from here in KPI Setup.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button component={RouterLink} to="/kpi-config" variant="outlined">KPI Setup</Button>
          {canCreate && <Button variant="contained" onClick={() => { setDialogError(''); setDialog({ form: blank }); }}>Add question</Button>}
        </Stack>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      <Card>
        <CardContent>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Actions</TableCell><TableCell>Question</TableCell><TableCell>Answer type</TableCell>
                  <TableCell>Default frequency</TableCell><TableCell align="right">Default target</TableCell><TableCell align="right">Assigned to</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell><TableCell>Last edited</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id} sx={{ opacity: m.isActive ? 1 : 0.6 }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {canEdit && <Tooltip title="Edit"><IconButton size="small" aria-label="Edit question" onClick={() => openEdit(m)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                      {canDelete && <Tooltip title={m.assignedCount ? 'Assigned to staff - set inactive instead' : 'Delete'}><span><IconButton size="small" aria-label="Delete question" disabled={m.assignedCount > 0} onClick={() => remove(m)}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>}
                    </TableCell>
                    <TableCell>{m.name}{m.description && <Typography variant="caption" color="text.secondary" display="block">{m.description}</Typography>}</TableCell>
                    <TableCell>{TYPE_LABEL[m.type]}{m.unit ? ` (${m.unit})` : ''}{m.type === 'choice' && <Typography variant="caption" color="text.secondary" display="block">{(m.answerOptions || []).join(' / ')}</Typography>}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{m.defaultFrequency}</TableCell>
                    <TableCell align="right">{m.defaultTarget === null ? '-' : Number(m.defaultTarget)}</TableCell>
                    <TableCell align="right">{m.assignedCount} staff</TableCell>
                    <TableCell><Chip size="small" clickable={canEdit} color={m.isActive ? 'success' : 'default'} label={m.isActive ? 'Active' : 'Inactive'} onClick={canEdit ? () => toggle(m) : undefined} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtStamp(m.createdAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtStamp(m.updatedAt)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={9} align="center">{loading ? 'Loading…' : 'No questions yet. Use “Add question”.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            An inactive question disappears from the Add KPI drop-down and from staff pages and reports; answers already recorded are kept, and it returns when set active again.
          </Typography>
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.id ? 'Edit question' : 'Add question'}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {dialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField required label="Question / figure" placeholder="e.g. New Prospect Calls (3-5)" value={dialog.form.name} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })} />
              <TextField label="Guidance (optional)" multiline minRows={2} value={dialog.form.description} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, description: e.target.value } })} />
              <Stack direction="row" spacing={2}>
                <TextField fullWidth select label="Answer type" value={dialog.form.type} disabled={!!dialog.inUse} helperText={dialog.inUse ? `Locked: assigned to ${dialog.inUse} staff` : undefined} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, type: e.target.value } })}>
                  <MenuItem value="number">Number (calls, meetings, $…)</MenuItem><MenuItem value="yes_no">Yes / No</MenuItem><MenuItem value="text">Text answer</MenuItem><MenuItem value="choice">Choice (pick from a list)</MenuItem>
                </TextField>
                <TextField fullWidth select label="Default frequency" value={dialog.form.defaultFrequency} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, defaultFrequency: e.target.value } })}>
                  <MenuItem value="daily">Daily</MenuItem><MenuItem value="weekly">Weekly</MenuItem><MenuItem value="monthly">Monthly</MenuItem>
                </TextField>
              </Stack>
              {dialog.form.type === 'choice' && (
                <TextField required multiline minRows={4} label="Answer choices (one per line)" placeholder={'Yes\nNo\nEscalated'} helperText="Staff pick one of these. At least two. Renaming one later does not change answers already recorded." value={dialog.form.answerOptions} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, answerOptions: e.target.value } })} />
              )}
              {dialog.form.type !== 'text' && dialog.form.type !== 'choice' && (
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth type="number" label="Default target per period" helperText="Pre-filled when assigned; can be changed per person" value={dialog.form.defaultTarget} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, defaultTarget: e.target.value } })} inputProps={{ min: 0 }} />
                  {dialog.form.type === 'number' && <TextField fullWidth label="Unit (optional)" placeholder="calls, $, visits" value={dialog.form.unit} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, unit: e.target.value } })} />}
                </Stack>
              )}
              <FormControlLabel control={<Checkbox checked={dialog.form.isActive} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, isActive: e.target.checked } })} />} label="Active (can be assigned and is shown to staff)" />
              {dialog.inUse ? <Alert severity="info" icon={false}>Changing the wording, guidance or unit updates it for all {dialog.inUse} staff it is assigned to.</Alert> : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !dialog?.form.name.trim() || (dialog?.form.type === 'choice' && dialog.form.answerOptions.split('\n').filter((x) => x.trim()).length < 2)}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
