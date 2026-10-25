import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton,
  LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const TYPE_LABEL: Record<string, string> = {
  text: 'Detailed text', number: 'Number', currency: 'Currency', date: 'Date', select: 'Choice (one answer)',
  yesno: 'Yes / No / Pending', contact: 'Contact (from the account)', product: 'Product', productMulti: 'Products (several)',
};
const blank = { stage: 'Customer engagement', text: '', type: 'text', mandatory: true, options: '', help: '', isActive: true };

// Who may use this page is decided in Role Management (the `questionnaire` privilege).
export default function QuestionMasterPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('questionnaire', 'create');
  const canEdit = hasPermission('questionnaire', 'update');
  const canDelete = hasPermission('questionnaire', 'delete');
  const [rows, setRows] = React.useState<any[]>([]);
  const [stages, setStages] = React.useState<string[]>([]);
  const [types, setTypes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [dialog, setDialog] = React.useState<{ id?: string; answerCount?: number; form: typeof blank; key?: string } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [dialogError, setDialogError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const r = await api.getQuestionMaster();
      setRows(r.data.data || []);
      setStages(r.data.meta?.stages || []);
      setTypes(r.data.meta?.types || []);
      setError('');
    } catch (e) { setError(errMsg(e, 'Could not load the question master')); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const openEdit = (q: any) => {
    setDialogError('');
    setDialog({ id: q.id, answerCount: q.answerCount, key: q.questionKey, form: {
      stage: q.stage, text: q.text, type: q.type, mandatory: q.mandatory, options: (q.options || []).join('\n'), help: q.help || '', isActive: q.isActive,
    } });
  };

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    setDialogError('');
    const f = dialog.form;
    const payload = { ...f, help: f.help || null, options: f.type === 'select' ? f.options : null };
    try {
      if (dialog.id) await api.updateQuestion(dialog.id, payload);
      else await api.createQuestion(payload);
      setDialog(null);
      setNotice(dialog.id ? 'Question updated. The change applies to the next save or stage move.' : 'Question added.');
      await load();
    } catch (e) { setDialogError(errMsg(e, 'Could not save the question')); } finally { setSaving(false); }
  };

  const toggleActive = async (q: any) => {
    try { await api.updateQuestion(q.id, { isActive: !q.isActive }); await load(); } catch (e) { setError(errMsg(e, 'Could not change the question')); }
  };

  const remove = async (q: any) => {
    if (!window.confirm(`Delete "${q.text}"?`)) return;
    try { await api.deleteQuestion(q.id); setNotice('Question deleted.'); await load(); } catch (e) { setError(errMsg(e, 'Could not delete the question')); }
  };

  const locked = !!dialog?.answerCount;
  const grouped = stages.map((s) => ({ stage: s, items: rows.filter((r) => r.stage === s) }));

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4">Question Master</Typography>
          <Typography variant="body2" color="text.secondary">The questions asked at each opportunity stage. Required questions must be answered before a deal can move on.</Typography>
        </Box>
        {canCreate && <Button variant="contained" onClick={() => { setDialogError(''); setDialog({ form: blank }); }}>Add question</Button>}
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {grouped.map((g) => (
        <Box key={g.stage} sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>{g.stage} <Typography component="span" variant="body2" color="text.secondary">({g.items.length})</Typography></Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Actions</TableCell><TableCell>Key</TableCell><TableCell>Question</TableCell>
                  <TableCell>Answer type</TableCell><TableCell>Required</TableCell><TableCell align="right">Answers saved</TableCell><TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {g.items.map((q) => (
                  <TableRow key={q.id} sx={{ opacity: q.isActive ? 1 : 0.6 }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {canEdit && <Tooltip title="Edit"><IconButton size="small" aria-label="Edit question" onClick={() => openEdit(q)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                      {canDelete && <Tooltip title={q.answerCount ? 'Has saved answers - retire it instead' : 'Delete'}><span><IconButton size="small" aria-label="Delete question" disabled={q.answerCount > 0} onClick={() => remove(q)}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>}
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{q.questionKey}</Typography></TableCell>
                    <TableCell>
                      {q.text}
                      {q.help && <Typography variant="caption" color="text.secondary" display="block">{q.help}</Typography>}
                      {q.type === 'select' && q.options && <Typography variant="caption" color="text.secondary" display="block">{q.options.join(' / ')}</Typography>}
                    </TableCell>
                    <TableCell>{TYPE_LABEL[q.type] || q.type}</TableCell>
                    <TableCell><Chip size="small" color={q.mandatory ? 'error' : 'default'} variant="outlined" label={q.mandatory ? 'Required' : 'Optional'} /></TableCell>
                    <TableCell align="right">{q.answerCount}</TableCell>
                    <TableCell>
                      <Chip size="small" clickable={canEdit} color={q.isActive ? 'success' : 'default'} label={q.isActive ? 'Active' : 'Retired'} onClick={canEdit ? () => toggleActive(q) : undefined} />
                    </TableCell>
                  </TableRow>
                ))}
                {g.items.length === 0 && !loading && <TableRow><TableCell colSpan={7} align="center">No questions in this stage yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ))}

      <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.id ? `Edit question ${dialog.key}` : 'Add question'}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {locked && <Alert severity="info" sx={{ mb: 2 }}>{dialog?.answerCount} answer(s) are saved. The stage and answer type are locked; to change them, retire this question and add a new one.</Alert>}
          {dialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select required label="Stage" value={dialog.form.stage} disabled={locked} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, stage: e.target.value } })}>
                {stages.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField required multiline minRows={2} label="Question" helperText="One question only. If it asks for two things, add two questions." value={dialog.form.text} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, text: e.target.value } })} />
              <TextField select required label="Answer type" value={dialog.form.type} disabled={locked} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, type: e.target.value } })}>
                {types.map((t) => <MenuItem key={t} value={t}>{TYPE_LABEL[t] || t}</MenuItem>)}
              </TextField>
              {dialog.form.type === 'select' && (
                <TextField required multiline minRows={3} label="Answers (one per line)" value={dialog.form.options} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, options: e.target.value } })} />
              )}
              <TextField label="Guidance for the salesperson (optional)" value={dialog.form.help} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, help: e.target.value } })} />
              <FormControlLabel control={<Checkbox checked={dialog.form.mandatory} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, mandatory: e.target.checked } })} />}
                label="Required before a deal can move past this stage" />
              <FormControlLabel control={<Checkbox checked={dialog.form.isActive} onChange={(e) => setDialog({ ...dialog, form: { ...dialog.form, isActive: e.target.checked } })} />}
                label="Active (shown to salespeople)" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !dialog?.form.text.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
