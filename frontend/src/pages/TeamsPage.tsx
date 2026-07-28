import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Chip, Card, CardContent, Autocomplete, Snackbar, Alert, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Layout from '@components/Layout';
import { api } from '@services/api';

interface Team {
  id: string;
  name: string;
  description?: string;
}

const emptyForm = { name: '', description: '' };

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Membership dialog
  const [memberTeam, setMemberTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [addUser, setAddUser] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([api.getTeams(), api.getUsers(1, 500)]);
      setTeams(t.data.data || []);
      setUsers(u.data.data || []);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not load teams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (t: Team) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || '' });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = { name: form.name, description: form.description };
      if (editing) await api.updateTeam(editing.id, payload);
      else await api.createTeam(payload);
      setOpen(false);
      setToast({ msg: editing ? 'Team updated' : 'Team created', sev: 'success' });
      load();
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed to save team', sev: 'error' });
    }
  };

  const remove = async (t: Team) => {
    if (!window.confirm(`Delete team "${t.name}"? Members and sub-teams are detached, not deleted.`)) return;
    try {
      await api.deleteTeam(t.id);
      setToast({ msg: 'Team deleted', sev: 'success' });
      load();
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed to delete team', sev: 'error' });
    }
  };

  const openMembers = async (t: Team) => {
    setMemberTeam(t);
    setAddUser(null);
    try {
      const res = await api.getTeamMembers(t.id);
      setMembers(res.data.data || []);
    } catch {
      setMembers([]);
    }
  };

  const assignMember = async () => {
    if (!memberTeam || !addUser) return;
    try {
      await api.setUserTeam(memberTeam.id, addUser.id);
      setToast({ msg: `${addUser.firstName} ${addUser.lastName} added to ${memberTeam.name}`, sev: 'success' });
      setAddUser(null);
      openMembers(memberTeam);
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed to assign user', sev: 'error' });
    }
  };

  const removeMember = async (member: any) => {
    if (!memberTeam) return;
    if (!window.confirm(`Remove ${member.firstName} ${member.lastName} from ${memberTeam.name}?`)) return;
    try {
      await api.removeUserFromTeam(memberTeam.id, member.id);
      setToast({ msg: `${member.firstName} ${member.lastName} removed from ${memberTeam.name}`, sev: 'success' });
      openMembers(memberTeam);
    } catch (e: any) {
      setToast({ msg: e.response?.data?.error || 'Failed to remove user', sev: 'error' });
    }
  };

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Teams / Groups</Typography>
          <Button variant="contained" onClick={openCreate}>Add Team</Button>
        </Box>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          A user in a group sees their own records plus those owned by anyone else in the same group.
          A user can belong to multiple groups; assign membership on the Users page (or via “Members” here).
          Users in no group see only their own records.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {teams.length === 0 && !loading ? (
          <Card><CardContent><Typography color="textSecondary">No teams yet. Click “Add Team” to create your first group.</Typography></CardContent></Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t.name}</TableCell>
                    <TableCell>{t.description || '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openMembers(t)}>Members</Button>
                      <Button size="small" onClick={() => openEdit(t)}>Edit</Button>
                      <Button size="small" color="error" onClick={() => remove(t)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create / Edit dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Edit Team' : 'Add Team'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField fullWidth label="Team Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mb: 2 }} />
            <TextField fullWidth label="Description" multiline rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!form.name.trim()}>{editing ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </Dialog>

        {/* Members dialog */}
        <Dialog open={!!memberTeam} onClose={() => setMemberTeam(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Members of {memberTeam?.name}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Autocomplete
                sx={{ flex: 1 }}
                options={users}
                getOptionLabel={(u: any) => `${u.firstName} ${u.lastName} (${u.email})`}
                value={addUser}
                onChange={(_, v) => setAddUser(v)}
                renderInput={(params) => <TextField {...params} label="Add a user to this team" />}
              />
              <Button variant="contained" onClick={assignMember} disabled={!addUser}>Add</Button>
            </Box>
            {members.length === 0 ? (
              <Typography variant="body2" color="textSecondary">No members yet.</Typography>
            ) : (
              members.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.firstName} ${m.lastName}`}
                  onDelete={() => removeMember(m)}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMemberTeam(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          {toast ? <Alert severity={toast.sev} onClose={() => setToast(null)}>{toast.msg}</Alert> : undefined}
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default TeamsPage;
