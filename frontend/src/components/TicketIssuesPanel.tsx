import React from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Delete as DeleteIcon, SyncAlt as MoveIcon } from '@mui/icons-material';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';
import VoiceTextField from '@components/VoiceTextField';
import { errMsg, fmt, openDays, stageColor, PRIORITY_COLOR, TICKET_COLOR, MoveDialog, HistoryTimeline, StageSteps, useWorkflow } from '@components/IssueParts';

// The "Issues" tab of a ticket: a checklist of items. Each item has its own stage (development, testing,
// user acceptance, deployment ...), when it was added and resolved, and a hover history. The ticket
// closes by itself once every item is closed.
export default function TicketIssuesPanel({ ticketId, ticketStatus, onTicketChanged }: { ticketId: string; ticketStatus: string; onTicketChanged: () => void }) {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('issue_log', 'create');
  const canUpdate = hasPermission('issue_log', 'update');
  const canDelete = hasPermission('issue_log', 'delete');
  const wf = useWorkflow();
  const [items, setItems] = React.useState<any[]>([]);
  const [staff, setStaff] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState('Medium');
  const [adding, setAdding] = React.useState(false);
  const [moving, setMoving] = React.useState<any | null>(null);
  const [histories, setHistories] = React.useState<Record<string, any[] | null>>({});

  const load = React.useCallback(async () => {
    try {
      const r = await api.getIssues({ ticketId, limit: 500 });
      // oldest first so the checklist reads in the order items were added
      setItems([...(r.data.data || [])].sort((a: any, b: any) => a.issueNumber - b.issueNumber));
      setError('');
    } catch (e) { setError(errMsg(e, 'Could not load the items')); } finally { setLoading(false); }
  }, [ticketId]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { api.getIssueAssignees().then((r) => setStaff(r.data.data || [])).catch(() => setStaff([])); }, []);
  const people = staff; // Development staff only

  const done = items.filter((i) => i.stage === 'Deployed' || i.stage === 'Cancelled').length;

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.createIssue({ ticketId, title: title.trim(), priority });
      setTitle('');
      await load();
      onTicketChanged();
    } catch (e) { setError(errMsg(e, 'Could not add the item')); } finally { setAdding(false); }
  };

  const loadHistory = async (id: string) => {
    if (histories[id]) return;
    setHistories((h) => ({ ...h, [id]: null }));
    try {
      const r = await api.getIssueHistory(id);
      setHistories((h) => ({ ...h, [id]: r.data.data || [] }));
    } catch { setHistories((h) => ({ ...h, [id]: [] })); }
  };

  // The checkbox means "closed" (Deployed). Stages cannot be skipped and deploying needs the customer's name,
  // so ticking always opens the stage dialog; an item still early in the cycle gets a hint instead of a shortcut.
  const toggle = (i: any, checked: boolean) => {
    if (!canUpdate) return;
    setNotice('');
    if (checked && i.stage !== 'User acceptance') setNotice(`This item is at "${i.stage}". Move it through the remaining stages to close it.`);
    setMoving(i);
  };

  const remove = async (i: any) => {
    if (!window.confirm(`Delete "${i.title}"? Its history is deleted too.`)) return;
    try { await api.deleteIssue(i.id); await load(); onTicketChanged(); } catch (e) { setError(errMsg(e, 'Could not delete the item')); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>{done} of {items.length} items closed</Typography>
        <Chip size="small" color={TICKET_COLOR[ticketStatus] || 'default'} label={`Ticket: ${ticketStatus}`} />
      </Box>
      <LinearProgress variant="determinate" value={items.length ? (done / items.length) * 100 : 0} color={items.length && done === items.length ? 'success' : 'primary'} sx={{ height: 8, borderRadius: 1, mb: 2 }} />
      {items.length > 0 && done === items.length && <Alert severity="success" sx={{ mb: 2 }}>Every item is closed, so this ticket is closed.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {canCreate && (
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <VoiceTextField context="ticket_title" label="Add an item" placeholder="What needs to be done? (press Enter to add)" size="small" value={title} onChange={setTitle}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          </Box>
          <TextField size="small" select label="Priority" sx={{ minWidth: 110 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            {['Critical', 'High', 'Medium', 'Low'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={add} disabled={adding || !title.trim()} sx={{ height: 40 }}>{adding ? 'Adding…' : 'Add'}</Button>
        </Stack>
      )}

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Item</TableCell>
              <TableCell>Stage <Typography component="span" variant="caption" color="text.secondary">(hover for history)</Typography></TableCell>
              <TableCell>Added</TableCell>
              <TableCell>Resolved</TableCell>
              <TableCell>Closed</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((i) => {
              const closed = i.stage === 'Deployed' || i.stage === 'Cancelled';
              return (
                <TableRow key={i.id} hover>
                  <TableCell padding="checkbox">
                    <Tooltip title={closed ? 'Closed - tick to reopen' : i.stage === 'User acceptance' ? 'Tick to deploy and close this item' : `At "${i.stage}" - move it forward to close it`}>
                      <span><Checkbox checked={closed} disabled={!canUpdate || i.stage === 'Cancelled'} onChange={(e) => toggle(i, e.target.checked)} inputProps={{ 'aria-label': `Close ${i.title}` }} /></span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textDecoration: closed ? 'line-through' : 'none', color: closed ? 'text.secondary' : 'text.primary' }}>
                      #{i.issueNumber} {i.title}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip size="small" variant="outlined" color={PRIORITY_COLOR[i.priority]} label={i.priority} sx={{ height: 18, fontSize: 11 }} />
                      {i.assigneeName && <Typography variant="caption" color="text.secondary">{i.assigneeName}</Typography>}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      arrow placement="top-start"
                      onOpen={() => loadHistory(i.id)}
                      title={<Box><Typography variant="caption" sx={{ fontWeight: 700 }}>Stage history</Typography><HistoryTimeline rows={histories[i.id] === undefined ? null : histories[i.id]} /></Box>}
                    >
                      <Box sx={{ display: 'inline-block', cursor: 'help' }}>
                        <Chip size="small" color={stageColor(i.stage)} label={i.stage} />
                        <StageSteps stage={i.stage} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(i.createdAt)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{i.resolvedAt ? fmt(i.resolvedAt) : '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {i.closedAt ? <>{fmt(i.closedAt)}<Typography variant="caption" color="text.secondary" display="block">{i.stage === 'Cancelled' ? 'cancelled' : `took ${openDays(i.createdAt, i.closedAt)}`}</Typography></> : <Typography variant="body2" color="text.secondary">open {openDays(i.createdAt, null)}</Typography>}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {canUpdate && <Tooltip title="Change stage"><IconButton size="small" aria-label="Change stage" onClick={() => setMoving(i)}><MoveIcon fontSize="small" /></IconButton></Tooltip>}
                    {canDelete && <Tooltip title="Delete"><IconButton size="small" aria-label="Delete item" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && !loading && <TableRow><TableCell colSpan={7} align="center">No items yet. Add the first one above.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Box>

      {moving && wf && (
        <MoveDialog issue={moving} wf={wf} staff={people} onClose={() => setMoving(null)}
          onDone={(msg) => { const id = moving.id; setMoving(null); setNotice(msg); setHistories((h) => { const n = { ...h }; delete n[id]; return n; }); load(); onTicketChanged(); }} />
      )}
    </Box>
  );
}
