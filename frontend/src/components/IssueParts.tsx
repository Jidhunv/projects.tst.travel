import React from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import VoiceTextField from '@components/VoiceTextField';
import { Check as CheckIcon } from '@mui/icons-material';
import { api } from '@services/api';

// Pieces shared by the Issue Log page and the Issues tab inside a ticket.

export const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
export const openDays = (from: any, to: any) => {
  const d = (new Date(to || Date.now()).getTime() - new Date(from).getTime()) / 86_400_000;
  return d < 1 ? `${Math.max(0, Math.round(d * 24))} h` : `${Math.round(d * 10) / 10} d`;
};
export const fmt = (v: any) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
export const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'default' };
export const TICKET_COLOR: Record<string, 'success' | 'warning' | 'info' | 'default'> = { Closed: 'success', 'In Progress': 'info', 'Pending Customer': 'warning', Open: 'default', Resolved: 'success' };

export interface Workflow { stages: string[]; onHold: string; cancelled: string; help: Record<string, string> }
export const stageColor = (s: string): 'success' | 'warning' | 'info' | 'default' | 'primary' | 'error' =>
  s === 'Deployed' ? 'success' : s === 'Cancelled' ? 'default' : s === 'On hold' ? 'error' : s === 'User acceptance' ? 'warning' : s === 'Logged' ? 'default' : 'primary';


export function MoveDialog({ issue, wf, staff, onClose, onDone }: { issue: any; wf: Workflow; staff: any[]; onClose: () => void; onDone: (m: string) => void }) {
  const idx = wf.stages.indexOf(issue.stage);
  // Offer the next stage first, then earlier ones (rework), then hold / cancel.
  const next = idx >= 0 && idx < wf.stages.length - 1 ? [wf.stages[idx + 1]] : [];
  const earlier = idx > 0 ? wf.stages.slice(0, idx) : [];
  const options = issue.stage === wf.onHold ? wf.stages.slice(0, wf.stages.length - 1) : [...next, ...earlier];
  const more = [issue.stage !== wf.onHold ? wf.onHold : null, wf.cancelled].filter(Boolean) as string[];
  const [to, setTo] = React.useState(options[0] || '');
  const [note, setNote] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [assignee, setAssignee] = React.useState(issue.assigneeId || '');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const needsNote = to === wf.onHold || to === wf.cancelled || issue.stage === wf.onHold || (idx >= 0 && wf.stages.indexOf(to) < idx);
  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await api.moveIssueStage(issue.id, { toStage: to, note, customerContact: contact || undefined, assigneeId: assignee || undefined });
      onDone(`Moved to "${to}".${r.data.ticketChanged ? ` Ticket is now ${r.data.ticketStatus}.` : ''}`);
    } catch (e) { setErr(errMsg(e, 'Could not move the issue')); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Update stage — #{issue.issueNumber} {issue.title}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">Now: <Chip size="small" color={stageColor(issue.stage)} label={issue.stage} /> {wf.help[issue.stage]}</Typography>
          <TextField select label="Move to" value={to} onChange={(e) => setTo(e.target.value)} helperText={wf.help[to]}>
            {options.map((s) => <MenuItem key={s} value={s}>{s}{s === next[0] ? ' (next)' : ' (go back)'}</MenuItem>)}
            {more.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          {(to === 'Under development' || issue.assigneeId) && (
            <>
              <TextField select required={to === 'Under development'} label="Developer" value={assignee} onChange={(e) => setAssignee(e.target.value)}
                helperText={staff.length === 0 ? 'No one is set up as a developer yet' : 'Only people in the Development department can be assigned'}>
                <MenuItem value="">Unassigned</MenuItem>
                {staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
              </TextField>
              {staff.length === 0 && <Alert severity="warning">Tick Development against the developers' roles (Role Management) or their user accounts (User Management), then they will appear here.</Alert>}
            </>
          )}
          {to === 'Deployed' && (
            <TextField required label="Customer who accepted and gave permission to deploy" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Ali Hassan, IT Manager" />
          )}
          <VoiceTextField context="ticket" label={needsNote ? 'Reason (required)' : 'Note (optional)'} multiline minRows={2} required={needsNote} value={note} onChange={setNote} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !to}>{busy ? 'Saving…' : 'Move'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// The stage history of one issue, as a list (used in hover tooltips and dialogs).
export function HistoryTimeline({ rows }: { rows: any[] | null }) {
  if (rows === null) return <Typography variant="caption">Loading history…</Typography>;
  if (rows.length === 0) return <Typography variant="caption">No history yet.</Typography>;
  return (
    <Stack spacing={0.75} sx={{ py: 0.5, maxWidth: 360 }}>
      {rows.map((h) => (
        <Box key={h.id}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{h.fromStage ? `${h.fromStage} → ${h.toStage}` : h.toStage}</Typography>
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>{fmt(h.createdAt)} · {h.actorName || 'Unknown'}</Typography>
          {h.customerContact && <Typography variant="caption" sx={{ display: 'block' }}>Customer approval: {h.customerContact}</Typography>}
          {h.note && <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>{h.note}</Typography>}
        </Box>
      ))}
    </Stack>
  );
}

// Loads the stage workflow once.
export function useWorkflow() {
  const [wf, setWf] = React.useState<Workflow | null>(null);
  React.useEffect(() => { api.getIssueWorkflow().then((r) => setWf(r.data.data)).catch(() => setWf(null)); }, []);
  return wf;
}

// The four checkpoints after "Logged" for one item: development, testing, user acceptance, deployment.
// A ticked step is finished, the highlighted step is where the item is now, the rest are still to come.
const STEPS = [
  { stage: 'Under development', label: 'Development' },
  { stage: 'Testing', label: 'Testing' },
  { stage: 'User acceptance', label: 'Acceptance' },
  { stage: 'Deployed', label: 'Deployed' },
];
export function StageSteps({ stage }: { stage: string }) {
  const order = ['Logged', ...STEPS.map((s) => s.stage)];
  const idx = order.indexOf(stage); // -1 for On hold / Cancelled: nothing is shown as current
  return (
    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
      {STEPS.map((s, i) => {
        const pos = i + 1;
        const done = idx > pos || (idx === pos && s.stage === 'Deployed');
        const current = idx === pos && !done;
        return (
          <Chip
            key={s.stage}
            size="small"
            icon={done ? <CheckIcon style={{ fontSize: 12 }} /> : undefined}
            label={s.label}
            color={done ? 'success' : current ? 'primary' : 'default'}
            variant={done || current ? 'filled' : 'outlined'}
            sx={{ height: 18, fontSize: 10, opacity: done || current ? 1 : 0.6, '& .MuiChip-label': { px: 0.75 } }}
          />
        );
      })}
    </Stack>
  );
}
