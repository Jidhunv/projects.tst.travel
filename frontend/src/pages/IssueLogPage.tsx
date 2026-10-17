import React from 'react';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, LinearProgress, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { ArrowBack as BackIcon, Delete as DeleteIcon, Edit as EditIcon, History as HistoryIcon, SyncAlt as MoveIcon } from '@mui/icons-material';
import VoiceTextField from '@components/VoiceTextField';
import Layout from '@components/Layout';
import IssueSlaReport from '@components/IssueSlaReport';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const openDays = (from: any, to: any) => {
  const d = (new Date(to || Date.now()).getTime() - new Date(from).getTime()) / 86_400_000;
  return d < 1 ? `${Math.max(0, Math.round(d * 24))} h` : `${Math.round(d * 10) / 10} d`;
};
const fmt = (v: any) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = { Critical: 'error', High: 'warning', Medium: 'info', Low: 'default' };
const TICKET_COLOR: Record<string, 'success' | 'warning' | 'info' | 'default'> = { Closed: 'success', 'In Progress': 'info', 'Pending Customer': 'warning', Open: 'default', Resolved: 'success' };

interface Workflow { stages: string[]; onHold: string; cancelled: string; help: Record<string, string> }
const stageColor = (s: string): 'success' | 'warning' | 'info' | 'default' | 'primary' | 'error' =>
  s === 'Closed' ? 'success' : s === 'Cancelled' ? 'default' : s === 'On hold' ? 'error' : s.startsWith('Customer') || s === 'Approved for deployment' ? 'warning' : s === 'Logged' ? 'default' : 'primary';

// Client issue log: every client's tickets broken into issues, each with its stage, so everyone sees what is open and what is done.
export default function IssueLogPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('issue_log', 'create');
  const canUpdate = hasPermission('issue_log', 'update');
  const canDelete = hasPermission('issue_log', 'delete');
  const [wf, setWf] = React.useState<Workflow | null>(null);
  const [clients, setClients] = React.useState<any[]>([]);
  const [stageCounts, setStageCounts] = React.useState<{ stage: string; count: number }[]>([]);
  const [search, setSearch] = React.useState('');
  const [client, setClient] = React.useState<any | null>(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [staff, setStaff] = React.useState<any[]>([]);
  const [tab, setTab] = React.useState(0);

  React.useEffect(() => { api.getIssueWorkflow().then((r) => setWf(r.data.data)).catch((e) => setError(errMsg(e, 'Could not load the workflow'))); }, []);
  React.useEffect(() => { api.getUsers(1, 500).then((r) => setStaff(r.data.data || [])).catch(() => setStaff([])); }, []);

  const loadClients = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getIssueClients(search ? { search } : undefined);
      setClients(r.data.data || []);
      setStageCounts(r.data.stages || []);
      setError('');
    } catch (e) { setError(errMsg(e, 'Failed to load the issue log')); } finally { setLoading(false); }
  }, [search]);
  React.useEffect(() => { const t = setTimeout(loadClients, 250); return () => clearTimeout(t); }, [loadClients]);

  const assignees = staff.length ? staff : user ? [{ id: user.id, firstName: user.firstName, lastName: user.lastName }] : [];

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h4">Client Issue Log</Typography>
          <Typography variant="body2" color="text.secondary">Every client's issues and how far each has got. A ticket closes by itself once all of its issues are closed.</Typography>
        </Box>
        {client && <Button startIcon={<BackIcon />} onClick={() => { setClient(null); loadClients(); }}>All clients</Button>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setClient(null); }} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Issues by client" /><Tab label="SLA report" />
      </Tabs>

      {tab === 1 ? <IssueSlaReport staff={assignees} /> : (
      <>
      {wf && <StageStrip wf={wf} counts={stageCounts} />}

      {!client ? (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField size="small" label="Search client" value={search} onChange={(e) => setSearch(e.target.value)} />
              {canCreate && <Button variant="contained" onClick={() => setClient({ accountId: null, accountName: 'New issue' })}>Log an issue</Button>}
            </Stack>
            {loading && <LinearProgress sx={{ mb: 1 }} />}
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell><TableCell align="right">Tickets</TableCell><TableCell align="right">Issues</TableCell>
                    <TableCell align="right">Open</TableCell><TableCell align="right">Closed</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>Progress</TableCell><TableCell align="right">Urgent open</TableCell>
                    <TableCell align="right">With customer</TableCell><TableCell>Last update</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.accountId} hover sx={{ cursor: 'pointer' }} onClick={() => setClient(c)}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{c.accountName}</Typography></TableCell>
                      <TableCell align="right">{c.tickets}</TableCell>
                      <TableCell align="right">{c.total}</TableCell>
                      <TableCell align="right">{c.open}</TableCell>
                      <TableCell align="right">{c.closed}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{c.pctClosed}% closed</Typography>
                        <LinearProgress variant="determinate" value={c.pctClosed} color={c.pctClosed === 100 ? 'success' : 'primary'} sx={{ height: 8, borderRadius: 1 }} />
                      </TableCell>
                      <TableCell align="right">{c.urgentOpen > 0 ? <Typography variant="body2" color="error" fontWeight={700}>{c.urgentOpen}</Typography> : 0}</TableCell>
                      <TableCell align="right">{c.waitingOnCustomer}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(c.lastUpdate)}</TableCell>
                    </TableRow>
                  ))}
                  {clients.length === 0 && !loading && <TableRow><TableCell colSpan={9} align="center">No issues logged yet{canCreate ? '. Use “Log an issue”.' : '.'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <ClientDetail
          client={client} wf={wf} staff={assignees} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete}
          setError={setError} setNotice={setNotice}
        />
      )}
      </>
      )}
    </Layout>
  );
}

// The pipeline at a glance: how many issues sit in each stage.
function StageStrip({ wf, counts }: { wf: Workflow; counts: { stage: string; count: number }[] }) {
  const byStage = new Map(counts.map((c) => [c.stage, c.count]));
  const all = [...wf.stages, wf.onHold, wf.cancelled];
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {all.map((s) => (
            <Tooltip key={s} title={wf.help[s] || ''}>
              <Chip size="small" color={stageColor(s)} variant={(byStage.get(s) || 0) > 0 ? 'filled' : 'outlined'} label={`${s}: ${byStage.get(s) || 0}`} />
            </Tooltip>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ClientDetail({ client, wf, staff, canCreate, canUpdate, canDelete, setError, setNotice }: {
  client: any; wf: Workflow | null; staff: any[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean; setError: (m: string) => void; setNotice: (m: string) => void;
}) {
  const isNew = !client.accountId;
  const [account, setAccount] = React.useState<any | null>(isNew ? null : { id: client.accountId, name: client.accountName });
  const [accOptions, setAccOptions] = React.useState<any[]>([]);
  const [issues, setIssues] = React.useState<any[]>([]);
  const [state, setState] = React.useState<'open' | 'closed' | ''>('');
  const [stage, setStage] = React.useState('');
  const [assignee, setAssignee] = React.useState('');
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [moving, setMoving] = React.useState<any | null>(null);
  const [history, setHistory] = React.useState<{ issue: any; rows: any[] } | null>(null);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [logging, setLogging] = React.useState(isNew);

  React.useEffect(() => {
    if (!isNew) return;
    let live = true;
    const t = setTimeout(() => { api.getAccounts(1, 25, {}).then((r) => { if (live) setAccOptions(r.data.data || []); }).catch(() => undefined); }, 0);
    return () => { live = false; clearTimeout(t); };
  }, [isNew]);

  const load = React.useCallback(async () => {
    if (!account) { setIssues([]); return; }
    setLoading(true);
    try {
      const r = await api.getIssues({ accountId: account.id, ...(state ? { state } : {}), ...(stage ? { stage } : {}), ...(assignee ? { assigneeId: assignee } : {}), ...(text ? { search: text } : {}), limit: 500 });
      setIssues(r.data.data || []);
    } catch (e) { setError(errMsg(e, 'Failed to load issues')); } finally { setLoading(false); }
  }, [account, state, stage, assignee, text, setError]);
  React.useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  // Group by ticket
  const groups = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const i of issues) {
      const g = m.get(i.ticketId) || { ticketId: i.ticketId, ticketNumber: i.ticketNumber, ticketTitle: i.ticketTitle, ticketStatus: i.ticketStatus, items: [] as any[] };
      g.items.push(i);
      m.set(i.ticketId, g);
    }
    return [...m.values()];
  }, [issues]);

  const openHistory = async (issue: any) => {
    try { setHistory({ issue, rows: (await api.getIssueHistory(issue.id)).data.data || [] }); } catch (e) { setError(errMsg(e, 'Could not load the history')); }
  };
  const remove = async (i: any) => {
    if (!window.confirm(`Delete issue "${i.title}"? Its stage history is deleted too.`)) return;
    try { await api.deleteIssue(i.id); setNotice('Issue deleted.'); load(); } catch (e) { setError(errMsg(e, 'Could not delete the issue')); }
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            {isNew ? (
              <Autocomplete size="small" sx={{ minWidth: 260 }} options={accOptions} value={account} getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, v) => setAccount(v)} onInputChange={(_, v, r) => { if (r === 'input') api.getAccounts(1, 25, v ? { search: v } : {}).then((x) => setAccOptions(x.data.data || [])).catch(() => undefined); }}
                filterOptions={(x) => x} renderInput={(p) => <TextField {...p} label="Client" />} />
            ) : <Typography variant="h5">{client.accountName}</Typography>}
            {account && canCreate && <Button variant="contained" onClick={() => setLogging(true)}>Log issue</Button>}
          </Stack>
          {account && (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              <TextField size="small" select label="Show" sx={{ minWidth: 130 }} value={state} onChange={(e) => setState(e.target.value as any)}>
                <MenuItem value="">All issues</MenuItem><MenuItem value="open">Open</MenuItem><MenuItem value="closed">Closed</MenuItem>
              </TextField>
              <TextField size="small" select label="Stage" sx={{ minWidth: 190 }} value={stage} onChange={(e) => setStage(e.target.value)}>
                <MenuItem value="">Any stage</MenuItem>{wf && [...wf.stages, wf.onHold, wf.cancelled].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              {staff.length > 1 && (
                <TextField size="small" select label="Developer" sx={{ minWidth: 170 }} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <MenuItem value="">Anyone</MenuItem>{staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
                </TextField>
              )}
              <TextField size="small" label="Search" value={text} onChange={(e) => setText(e.target.value)} />
            </Stack>
          )}
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {account && groups.length === 0 && !loading && <Alert severity="info">No issues match. {canCreate ? 'Use “Log issue” to add one.' : ''}</Alert>}

      {groups.map((g) => {
        const done = g.items.filter((i: any) => i.stage === 'Closed' || i.stage === 'Cancelled').length;
        return (
          <Card key={g.ticketId} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Box>
                  <Typography variant="h6">{g.ticketNumber} · {g.ticketTitle}</Typography>
                  <Typography variant="caption" color="text.secondary">{done} of {g.items.length} issues closed{g.ticketStatus === 'Closed' ? ' — ticket closed' : ''}</Typography>
                </Box>
                <Chip size="small" color={TICKET_COLOR[g.ticketStatus] || 'default'} label={`Ticket: ${g.ticketStatus}`} />
              </Box>
              <LinearProgress variant="determinate" value={(done / g.items.length) * 100} color={done === g.items.length ? 'success' : 'primary'} sx={{ height: 8, borderRadius: 1, mb: 1 }} />
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>Actions</TableCell><TableCell>#</TableCell><TableCell>Issue</TableCell><TableCell>Priority</TableCell>
                      <TableCell sx={{ minWidth: 190 }}>Stage</TableCell><TableCell>Developer</TableCell><TableCell>Logged</TableCell><TableCell>Closed / open for</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {g.items.map((i: any) => {
                      const idx = wf ? wf.stages.indexOf(i.stage) : -1;
                      return (
                        <TableRow key={i.id}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {canUpdate && <Tooltip title="Update stage"><IconButton size="small" aria-label="Update stage" onClick={() => setMoving(i)}><MoveIcon fontSize="small" /></IconButton></Tooltip>}
                            <Tooltip title="History"><IconButton size="small" aria-label="History" onClick={() => openHistory(i)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                            {canUpdate && <Tooltip title="Edit"><IconButton size="small" aria-label="Edit issue" onClick={() => setEditing(i)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                            {canDelete && <Tooltip title="Delete"><IconButton size="small" aria-label="Delete issue" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                          </TableCell>
                          <TableCell>{i.issueNumber}</TableCell>
                          <TableCell>{i.title}{i.description && <Typography variant="caption" color="text.secondary" display="block">{i.description}</Typography>}</TableCell>
                          <TableCell><Chip size="small" color={PRIORITY_COLOR[i.priority]} label={i.priority} /></TableCell>
                          <TableCell>
                            <Chip size="small" color={stageColor(i.stage)} label={i.stage} />
                            {wf && idx >= 0 && <LinearProgress variant="determinate" value={((idx + 1) / wf.stages.length) * 100} color={stageColor(i.stage) === 'default' ? 'inherit' : (stageColor(i.stage) as any)} sx={{ height: 5, borderRadius: 1, mt: 0.5 }} />}
                          </TableCell>
                          <TableCell>{i.assigneeName || <Typography variant="body2" color="text.secondary">Unassigned</Typography>}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(i.createdAt)}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {i.closedAt ? <>{fmt(i.closedAt)}<Typography variant="caption" color="text.secondary" display="block">{i.stage === 'Cancelled' ? 'cancelled' : `took ${openDays(i.createdAt, i.closedAt)}`}</Typography></> : <Typography variant="body2" color="text.secondary">open {openDays(i.createdAt, null)}</Typography>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        );
      })}

      {moving && wf && <MoveDialog issue={moving} wf={wf} staff={staff} onClose={() => setMoving(null)} onDone={(msg) => { setMoving(null); setNotice(msg); load(); }} />}
      {editing && <EditDialog issue={editing} staff={staff} onClose={() => setEditing(null)} onDone={() => { setEditing(null); setNotice('Issue updated.'); load(); }} />}
      {logging && account && <LogDialog account={account} staff={staff} onClose={() => setLogging(false)} onDone={(msg) => { setLogging(false); setNotice(msg); load(); }} />}
      {history && (
        <Dialog open onClose={() => setHistory(null)} maxWidth="sm" fullWidth>
          <DialogTitle>#{history.issue.issueNumber} {history.issue.title}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {history.rows.map((h) => (
                <Box key={h.id} sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 1.5 }}>
                  <Typography variant="body2" fontWeight={600}>{h.fromStage ? `${h.fromStage} → ${h.toStage}` : h.toStage}</Typography>
                  <Typography variant="caption" color="text.secondary">{fmt(h.createdAt)} · {h.actorName || 'Unknown'}</Typography>
                  {h.customerContact && <Typography variant="body2">Customer approval: {h.customerContact}</Typography>}
                  {h.note && <Typography variant="body2" color="text.secondary">{h.note}</Typography>}
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setHistory(null)}>Close</Button></DialogActions>
        </Dialog>
      )}
    </>
  );
}

function MoveDialog({ issue, wf, staff, onClose, onDone }: { issue: any; wf: Workflow; staff: any[]; onClose: () => void; onDone: (m: string) => void }) {
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
          {to === 'Picked up' && (
            <TextField select required label="Developer" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
            </TextField>
          )}
          {to === 'Approved for deployment' && (
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

function EditDialog({ issue, staff, onClose, onDone }: { issue: any; staff: any[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = React.useState({ title: issue.title, description: issue.description || '', priority: issue.priority, assigneeId: issue.assigneeId || '' });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const save = async () => {
    setBusy(true); setErr('');
    try { await api.updateIssue(issue.id, { ...f, assigneeId: f.assigneeId || null }); onDone(); } catch (e) { setErr(errMsg(e, 'Could not save')); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Edit issue #{issue.issueNumber}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <VoiceTextField context="ticket_title" required label="Title" value={f.title} onChange={(v) => setF({ ...f, title: v })} />
          <VoiceTextField context="ticket" label="Description" multiline minRows={3} value={f.description} onChange={(v) => setF({ ...f, description: v })} />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth select label="Priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              {['Critical', 'High', 'Medium', 'Low'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField fullWidth select label="Developer" value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
              <MenuItem value="">Unassigned</MenuItem>{staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={save} disabled={busy || !f.title.trim()}>{busy ? 'Saving…' : 'Save'}</Button></DialogActions>
    </Dialog>
  );
}

function LogDialog({ account, staff, onClose, onDone }: { account: any; staff: any[]; onClose: () => void; onDone: (m: string) => void }) {
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [ticketId, setTicketId] = React.useState('');
  const [newTitle, setNewTitle] = React.useState('');
  const [f, setF] = React.useState({ title: '', description: '', priority: 'Medium', assigneeId: '' });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    api.getClientTickets(account.id).then((r) => {
      const open = (r.data.data || []).filter((t: any) => t.status !== 'Closed');
      setTickets(open);
      setTicketId(open[0]?.id || 'NEW');
    }).catch((e) => setErr(errMsg(e, 'Could not load the client\'s tickets')));
  }, [account.id]);

  const save = async () => {
    setBusy(true); setErr('');
    try {
      let tid = ticketId;
      if (tid === 'NEW') {
        const t = await api.createTicketQuick({ title: newTitle.trim(), description: f.description.trim() || newTitle.trim(), accountId: account.id, priority: f.priority });
        tid = t.data.data.id;
      }
      await api.createIssue({ ticketId: tid, title: f.title, description: f.description, priority: f.priority, assigneeId: f.assigneeId || null });
      onDone('Issue logged.');
    } catch (e) { setErr(errMsg(e, 'Could not log the issue')); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Log an issue — {account.name}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Ticket" value={ticketId} onChange={(e) => setTicketId(e.target.value)} helperText="Group the issue under an open ticket, or start a new one">
            {tickets.map((t) => <MenuItem key={t.id} value={t.id}>{t.ticketNumber} · {t.title}</MenuItem>)}
            <MenuItem value="NEW">+ New ticket</MenuItem>
          </TextField>
          {ticketId === 'NEW' && <VoiceTextField context="ticket_title" required label="New ticket title" value={newTitle} onChange={setNewTitle} placeholder="e.g. March release problems" />}
          <VoiceTextField context="ticket_title" required label="Issue" value={f.title} onChange={(v) => setF({ ...f, title: v })} />
          <VoiceTextField context="ticket" label="Details" multiline minRows={3} value={f.description} onChange={(v) => setF({ ...f, description: v })} />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth select label="Priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              {['Critical', 'High', 'Medium', 'Low'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField fullWidth select label="Developer (optional)" value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
              <MenuItem value="">Unassigned</MenuItem>{staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !f.title.trim() || !ticketId || (ticketId === 'NEW' && !newTitle.trim())}>{busy ? 'Saving…' : 'Log issue'}</Button>
      </DialogActions>
    </Dialog>
  );
}

