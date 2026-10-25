import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  IconButton, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { api } from '@services/api';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const fmt = (v: any) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const OUTCOME = ['Closed-Won', 'Closed-Lost'];

interface Props { opportunityId: string; accountId: string | null; opportunityName: string; onClose: () => void }

// The questionnaire for one deal: every question of the stages reached so far, with blanks where not yet answered.
export default function OpportunityQuestionnaire({ opportunityId, accountId, opportunityName, onClose }: Props) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [tab, setTab] = React.useState(0);
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    try {
      setData((await api.getQuestionnaire(opportunityId)).data.data);
      setError('');
    } catch (e) { setError(errMsg(e, 'Could not load the questionnaire')); } finally { setLoading(false); }
  }, [opportunityId]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    if (accountId) api.getAccountContacts(accountId).then((r) => setContacts(r.data.data || [])).catch(() => setContacts([]));
    api.getProducts(1, 500).then((r) => setProducts(r.data.data || [])).catch(() => setProducts([]));
  }, [accountId]);

  const stages: any[] = data?.stages || [];
  const shown = stages[tab] || null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Questionnaire — {opportunityName}
        {data && <Chip size="small" sx={{ ml: 1 }} color="primary" label={`Now in: ${data.stage}`} />}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <LinearProgress />}
        {data && (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
              {stages.map((s, i) => (
                <Tab key={s.stage} value={i} label={
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    {s.stage}
                    <Chip size="small" variant={s.complete ? 'filled' : 'outlined'} color={s.complete ? 'success' : 'default'}
                      label={`${s.mandatoryAnswered}/${s.mandatoryTotal}`} sx={{ height: 18, fontSize: 11 }} />
                  </Box>
                } />
              ))}
            </Tabs>
            {shown && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle2">{shown.stage}</Typography>
                  {shown.current && <Chip size="small" color="primary" label="Current stage" />}
                  {shown.complete
                    ? <Chip size="small" color="success" label="All required answers given" />
                    : <Chip size="small" color="warning" label={`${shown.mandatoryTotal - shown.mandatoryAnswered} required still to answer`} />}
                  {OUTCOME.includes(shown.stage) && <Typography variant="caption" color="text.secondary">Fill in when the deal closes this way.</Typography>}
                </Stack>
                <Stack spacing={1.5}>
                  {shown.questions.map((q: any) => (
                    <QuestionRow key={q.key} opportunityId={opportunityId} q={q} contacts={contacts} products={products}
                      onSaved={(d: any) => setData(d)} onError={(m: string) => setError(m)} />
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function QuestionRow({ opportunityId, q, contacts, products, onSaved, onError }: {
  opportunityId: string; q: any; contacts: any[]; products: any[]; onSaved: (d: any) => void; onError: (m: string) => void;
}) {
  const saved = q.answer;
  const isUnknown = saved?.status === 'unknown';
  const [value, setValue] = React.useState<string>(saved?.value ?? '');
  const [unknown, setUnknown] = React.useState(isUnknown);
  const [busy, setBusy] = React.useState(false);
  const [history, setHistory] = React.useState<any[] | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  React.useEffect(() => { setValue(saved?.value ?? ''); setUnknown(saved?.status === 'unknown'); }, [saved?.value, saved?.status]);

  const options: string[] = q.type === 'yesno' ? ['Yes', 'No', 'Pending'] : q.type === 'contact' ? contacts.map((c) => c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : q.type === 'product' || q.type === 'productMulti' ? products.map((p) => p.name) : q.options || [];
  const multi = q.type === 'productMulti';
  const selected: string[] = multi ? (() => { try { return JSON.parse(value || '[]'); } catch { return []; } })() : [];

  const save = async (next: { value?: string | null; status?: string }) => {
    setBusy(true);
    try {
      const r = await api.saveQuestionAnswer(opportunityId, q.key, next);
      onSaved(r.data.data);
      onError('');
    } catch (e) { onError(errMsg(e, 'Could not save the answer')); } finally { setBusy(false); }
  };

  const toggleHistory = async () => {
    setShowHistory((s) => !s);
    if (!history) {
      try { setHistory((await api.getQuestionHistory(opportunityId, q.key)).data.data || []); } catch { setHistory([]); }
    }
  };

  const input = (() => {
    const common = { size: 'small' as const, fullWidth: true, disabled: unknown || busy };
    switch (q.type) {
      case 'text':
        return <TextField {...common} multiline minRows={2} label="Answer" value={value} onChange={(e) => setValue(e.target.value)} />;
      case 'number':
      case 'currency':
        return <TextField {...common} type="number" label={q.type === 'currency' ? 'Amount' : 'Number'} value={value} onChange={(e) => setValue(e.target.value)} />;
      case 'date':
        return <TextField {...common} type="date" InputLabelProps={{ shrink: true }} label="Date" value={value} onChange={(e) => setValue(e.target.value)} />;
      case 'productMulti':
        return (
          <TextField {...common} select label="Products" SelectProps={{ multiple: true, renderValue: (v: any) => (v as string[]).join(', ') }}
            value={selected} onChange={(e) => setValue(JSON.stringify(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value))}>
            {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
        );
      default:
        return (
          <TextField {...common} select label="Answer" value={value} onChange={(e) => setValue(e.target.value)}>
            <MenuItem value="">-</MenuItem>
            {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
        );
    }
  })();

  const dirty = unknown ? !isUnknown : (value ?? '') !== (saved?.value ?? '') || isUnknown;
  const toggleUnknown = (on: boolean) => { setUnknown(on); if (on) save({ status: 'unknown' }); };

  return (
    <Box sx={{ p: 1.5, border: 1, borderColor: unknown ? 'warning.main' : 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="body2" fontWeight={600}>{q.text}</Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }} alignItems="center">
            <Chip size="small" variant="outlined" color={q.mandatory ? 'error' : 'default'} label={q.mandatory ? 'Required' : 'Optional'} sx={{ height: 18, fontSize: 10 }} />
            {q.help && <Typography variant="caption" color="text.secondary">{q.help}</Typography>}
          </Stack>
        </Box>
        <Tooltip title="Change history">
          <IconButton size="small" aria-label="Change history" onClick={toggleHistory}><HistoryIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ mt: 1 }}>{input}</Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
        <FormControlLabel control={<Checkbox size="small" checked={unknown} disabled={busy} onChange={(e) => toggleUnknown(e.target.checked)} />}
          label={<Typography variant="caption">Unknown / not confirmed</Typography>} />
        <Box sx={{ flex: 1 }} />
        {!unknown && dirty && <Button size="small" variant="contained" disabled={busy || value.trim() === ''} onClick={() => save({ value })}>Save</Button>}
        {saved?.updatedAt && (
          <Typography variant="caption" color="text.secondary">
            {unknown ? 'Marked unknown' : 'Saved'}{saved.updatedBy ? ` by ${saved.updatedBy}` : ''} · {fmt(saved.updatedAt)}
          </Typography>
        )}
        {!saved && !unknown && <Typography variant="caption" color="text.secondary">Not answered yet</Typography>}
      </Stack>

      <Collapse in={showHistory} unmountOnExit>
        <Box sx={{ mt: 1, pl: 1, borderLeft: 2, borderColor: 'divider' }}>
          {history === null && <Typography variant="caption">Loading…</Typography>}
          {history?.length === 0 && <Typography variant="caption">No changes yet.</Typography>}
          {history?.map((h, i) => (
            <Typography key={i} variant="caption" display="block">
              {fmt(h.createdAt)} · {h.actorName || 'Unknown'}: {h.newStatus === 'unknown' ? 'marked unknown' : `"${h.newValue ?? ''}"`}
              {h.oldValue ? ` (was "${h.oldValue}")` : ''}{h.note ? ` — ${h.note}` : ''}
            </Typography>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
