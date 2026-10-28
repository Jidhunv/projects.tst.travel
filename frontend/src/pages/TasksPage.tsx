import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tab, Tabs, TextField, Tooltip, Typography, CircularProgress,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';
import { ChatBubbleOutline as ChatIcon } from '@mui/icons-material';

// Task Manager: one person assigns a task to another. The assigner (owner) and the assignee see it;
// a role with read:all sees every task. The assignee can change the status and the actions taken.
// The follow-up conversation is kept on the Follow-ups tab of an existing task.
const STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const EMPTY = { title: '', description: '', priority: 'Medium', categoryId: '', followupDate: '', assigneeId: '', status: 'Open', actionsTaken: '' };
const isClosed = (status: string) => status === 'Completed' || status === 'Cancelled';

const priorityColor: Record<string, 'default' | 'info' | 'error'> = { Low: 'default', Medium: 'info', High: 'error' };
const statusColor: Record<string, 'default' | 'warning' | 'success'> = { Open: 'default', 'In Progress': 'warning', Completed: 'success', Cancelled: 'default' };

const errText = (e: any, fallback: string) => e?.response?.data?.error || e?.message || fallback;
// Same rule as the sales visit page: a follow-up date that has passed on a task still open.
const isOverdue = (task: any) => {
  if (!task.followupDate || isClosed(task.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.followupDate) < today;
};
const personName = (p?: { firstName: string; lastName: string } | null) => (p ? `${p.firstName} ${p.lastName}`.trim() : '-');

// One line of text. When it does not fit, it is cut off with an ellipsis and a dot marks it; the full text shows on hover.
const ClippedText: React.FC<{ text: string }> = ({ text }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    setClipped(!!el && el.scrollWidth > el.clientWidth);
  }, [text]);
  return (
    <Tooltip title={text} placement="top-start">
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, maxWidth: 240 }}>
        <Box
          ref={ref}
          component="span"
          sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {text}
        </Box>
        {clipped && <Box component="span" sx={{ ml: 0.75, width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
      </Box>
    </Tooltip>
  );
};

// Hover over the icon to read the task's follow-up conversation. It is fetched each time the icon is opened.
const FollowupHint: React.FC<{ taskId: string }> = ({ taskId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setFailed(false);
    api.getTaskFollowups(taskId)
      .then((res) => setItems(res.data.data || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  const shortNote = (note: string) => (note.length > 200 ? note.slice(0, 200) + '…' : note);

  const title = loading
    ? 'Loading follow-ups…'
    : failed
      ? 'Could not load the follow-ups'
      : items.length === 0
        ? 'No follow-ups yet'
        : (
          <Box>
            {items.slice(0, 5).map((f) => (
              <Box key={f.id} sx={{ mb: 1.25 }}>
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                  {new Date(f.createdAt).toLocaleDateString()} · {personName(f.createdBy)}
                  {f.nextFollowupDate ? ' · next ' + new Date(f.nextFollowupDate).toLocaleDateString() : ''}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{shortNote(f.note)}</Typography>
              </Box>
            ))}
            {items.length > 5 && <Typography variant="caption">+{items.length - 5} more in the task</Typography>}
          </Box>
        );

  return (
    <Tooltip title={title} onOpen={load} componentsProps={{ tooltip: { sx: { maxWidth: 380 } } }}>
      <IconButton size="small" aria-label="Follow-up messages">
        <ChatIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export const TasksPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('tasks', 'create');

  const [rows, setRows] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [view, setView] = useState<'all' | 'assignedToMe' | 'assignedByMe'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saveError, setSaveError] = useState('');

  const [tab, setTab] = useState(0);
  const [followups, setFollowups] = useState<any[]>([]);
  const [followupNote, setFollowupNote] = useState('');
  const [followupNext, setFollowupNext] = useState('');
  const [followupError, setFollowupError] = useState('');
  const [addingFollowup, setAddingFollowup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getTasks({ view });
      setRows(res.data.data || []);
    } catch (e) {
      setError(errText(e, 'Could not load tasks'));
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getTaskAssignees()
      .then((res) => setPeople(res.data.data || []))
      .catch((e) => setError(errText(e, 'Could not load the people a task can be assigned to')));
  }, []);

  useEffect(() => {
    api.getTaskCategories({ isActive: true })
      .then((res) => setCategories(res.data.data || []))
      .catch((e) => setError(errText(e, 'Could not load the task categories')));
  }, []);

  // The follow-up conversation is loaded when its tab opens.
  useEffect(() => {
    if (!editing || tab !== 1) return;
    api.getTaskFollowups(editing.id)
      .then((res) => setFollowups(res.data.data || []))
      .catch((e) => setFollowupError(errText(e, 'Could not load the follow-ups')));
    /* eslint-disable-next-line */
  }, [editing?.id, tab]);

  const isOwner = (task: any) => task.ownerId === user?.id;
  // Only the assigner edits the details; the assignee changes the status and nothing else.
  const ownerMode = creating || (!!editing && isOwner(editing));
  const assignable = people.filter((p) => p.id !== user?.id);

  const openNew = () => { setForm(EMPTY); setSaveError(''); setTab(0); setCreating(true); };
  const openEdit = (task: any) => {
    setSaveError('');
    setTab(0);
    setFollowups([]);
    setFollowupError('');
    setFollowupNote('');
    setFollowupNext('');
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      categoryId: task.categoryId || '',
      followupDate: task.followupDate || '',
      assigneeId: task.assigneeId,
      status: task.status,
      actionsTaken: task.actionsTaken || '',
    });
    setEditing(task);
  };

  const save = async () => {
    setSaveError('');
    try {
      if (creating) {
        await api.createTask({
          title: form.title,
          description: form.description,
          priority: form.priority,
          categoryId: form.categoryId,
          followupDate: form.followupDate || null,
          assigneeId: form.assigneeId,
        });
        setCreating(false);
      } else if (editing) {
        const body = ownerMode
          ? {
              title: form.title,
              description: form.description,
              priority: form.priority,
              followupDate: form.followupDate || null,
              categoryId: form.categoryId,
              assigneeId: form.assigneeId,
              status: form.status,
              actionsTaken: form.actionsTaken,
            }
          : { status: form.status, actionsTaken: form.actionsTaken };
        await api.updateTask(editing.id, body);
        setEditing(null);
      }
      load();
    } catch (e) {
      setSaveError(errText(e, 'Could not save the task'));
    }
  };

  // Adds an entry to the conversation. A next follow-up date also moves the task's follow-up date.
  const addFollowup = async () => {
    if (!editing) return;
    setFollowupError('');
    setAddingFollowup(true);
    try {
      const res = await api.addTaskFollowup(editing.id, {
        note: followupNote,
        nextFollowupDate: followupNext || null,
      });
      setFollowups(res.data.data || []);
      setFollowupNote('');
      setFollowupNext('');
      load();
    } catch (e) {
      setFollowupError(errText(e, 'Could not add the follow-up'));
    } finally {
      setAddingFollowup(false);
    }
  };

  const remove = async (task: any) => {
    if (!window.confirm(`Delete the task "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      load();
    } catch (e) {
      setError(errText(e, 'Could not delete the task'));
    }
  };

  const dialogOpen = creating || !!editing;
  const closeDialog = () => { setCreating(false); setEditing(null); };
  const showFollowups = !!editing && !creating;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Task Manager</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              label="Show"
              value={view}
              onChange={(e) => setView(e.target.value as any)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All tasks I can see</MenuItem>
              <MenuItem value="assignedToMe">Assigned to me</MenuItem>
              <MenuItem value="assignedByMe">Assigned by me</MenuItem>
            </TextField>
            {canCreate && <Button variant="contained" onClick={openNew}>New task</Button>}
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Assigned by</TableCell>
                  <TableCell>Assigned to</TableCell>
                  <TableCell>Follow-up Date</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions Taken</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Typography variant="body2" color="textSecondary">No tasks to show.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{task.title}</Typography></TableCell>
                    <TableCell>{task.description ? <ClippedText text={task.description} /> : '-'}</TableCell>
                    <TableCell>{task.category?.name || '-'}</TableCell>
                    <TableCell>{personName(task.owner)}</TableCell>
                    <TableCell>{personName(task.assignee)}</TableCell>
                    <TableCell sx={{ color: isOverdue(task) ? 'error.main' : 'inherit', fontWeight: isOverdue(task) ? 600 : 400 }}>
                      {task.followupDate ? new Date(task.followupDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell><Chip size="small" label={task.priority} color={priorityColor[task.priority] || 'default'} /></TableCell>
                    <TableCell><Chip size="small" label={task.status} color={statusColor[task.status] || 'default'} /></TableCell>
                    <TableCell>{task.actionsTaken ? <ClippedText text={task.actionsTaken} /> : '-'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <FollowupHint taskId={task.id} />
                      <Button size="small" onClick={() => openEdit(task)}>
                        {isOwner(task) ? 'Edit' : 'Update'}
                      </Button>
                      {isOwner(task) && (
                        <Button size="small" color="error" onClick={() => remove(task)}>Delete</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{creating ? 'New task' : ownerMode ? 'Edit task' : 'Update task'}</DialogTitle>
          {showFollowups && (
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Details" />
              <Tab label={`Follow-ups${followups.length ? ` (${followups.length})` : ''}`} />
            </Tabs>
          )}
          <DialogContent sx={{ pt: 2 }}>
            {(!showFollowups || tab === 0) && (
              <>
                <TextField
                  fullWidth
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  disabled={!ownerMode}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  disabled={!ownerMode}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  disabled={!ownerMode}
                  helperText={categories.length === 0 ? 'No categories yet. An admin adds them under Masters > Task Categories.' : undefined}
                  sx={{ mb: 2 }}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  select
                  label="Assign to"
                  value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  disabled={!ownerMode}
                  helperText={people.length === 0 ? 'No active users to assign to' : undefined}
                  sx={{ mb: 2 }}
                >
                  {(creating ? assignable : people).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`.trim()}</MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Follow-up date"
                    InputLabelProps={{ shrink: true }}
                    value={form.followupDate}
                    onChange={(e) => setForm({ ...form, followupDate: e.target.value })}
                    disabled={!ownerMode}
                  />
                  <TextField
                    fullWidth
                    select
                    label="Priority"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    disabled={!ownerMode}
                  >
                    {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </TextField>
                </Stack>
                {!creating && (
                  <>
                    <TextField
                      fullWidth
                      select
                      label="Status"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      sx={{ mb: 2 }}
                    >
                      {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      label="Actions taken"
                      value={form.actionsTaken}
                      onChange={(e) => setForm({ ...form, actionsTaken: e.target.value })}
                      placeholder="What has been done on this task..."
                    />
                  </>
                )}
                {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
              </>
            )}

            {showFollowups && tab === 1 && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      label="Follow-up conversation"
                      value={followupNote}
                      onChange={(e) => setFollowupNote(e.target.value)}
                      placeholder="What was discussed or agreed..."
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label="Next follow-up date"
                      InputLabelProps={{ shrink: true }}
                      value={followupNext}
                      onChange={(e) => setFollowupNext(e.target.value)}
                    />
                    <Box>
                      <Button variant="contained" onClick={addFollowup} disabled={addingFollowup || !followupNote.trim()}>
                        {addingFollowup ? 'Adding…' : 'Add follow-up'}
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
                {followupError && <Alert severity="error">{followupError}</Alert>}
                {followups.length === 0 && (
                  <Typography variant="body2" color="textSecondary">No follow-ups yet.</Typography>
                )}
                {followups.map((f) => (
                  <Paper key={f.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(f.createdAt).toLocaleString()} · {personName(f.createdBy)}
                      </Typography>
                      {f.nextFollowupDate && (
                        <Chip size="small" variant="outlined" label={`Next follow-up ${new Date(f.nextFollowupDate).toLocaleDateString()}`} />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{f.note}</Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>{showFollowups && tab === 1 ? 'Close' : 'Cancel'}</Button>
            {(!showFollowups || tab === 0) && (
              <Button variant="contained" onClick={save} disabled={creating && !form.assigneeId}>
                {creating ? 'Assign task' : 'Save'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default TasksPage;
