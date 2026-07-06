import React, { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  Checkbox, ListItemText, FormControl, InputLabel, OutlinedInput, Box, Chip,
} from '@mui/material';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

type Module = 'leads' | 'accounts' | 'opportunities' | 'tickets';

interface Props {
  module: Module;
  recordId: string;
  currentOwnerId?: string;
  currentAssigneeIds?: string[];
  onAssigned?: () => void;
  size?: 'small' | 'medium';
}

// "Assign" button + dialog to assign a record to one OR MORE users.
// The first selected user becomes the primary owner; all are stored as assignees.
// Renders nothing unless the current user is allowed to reassign this module.
export const AssignOwner: React.FC<Props> = ({ module, recordId, currentOwnerId, currentAssigneeIds, onAssigned, size = 'small' }) => {
  const canReassign = useAuth((s) => s.canReassign);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (users.length === 0) {
        api.getUsers(1, 200).then((r) => setUsers(r.data.data || [])).catch(() => {});
      }
      setIds(
        currentAssigneeIds && currentAssigneeIds.length
          ? currentAssigneeIds
          : currentOwnerId ? [currentOwnerId] : []
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!canReassign(module)) return null;

  const assignFn: Record<Module, (id: string, ids: string[]) => Promise<any>> = {
    leads: api.assignLead,
    accounts: api.assignAccount,
    opportunities: api.assignOpportunity,
    tickets: api.assignTicket,
  };
  const nameOf = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  const save = async () => {
    if (!ids.length) return;
    setSaving(true);
    try {
      await assignFn[module](recordId, ids);
      setOpen(false);
      onAssigned?.();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size={size} color="secondary" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        Assign
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign to users</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Assignees</InputLabel>
            <Select
              multiple
              value={ids}
              input={<OutlinedInput label="Assignees" />}
              onChange={(e) => setIds(typeof e.target.value === 'string' ? e.target.value.split(',') : (e.target.value as string[]))}
              renderValue={(sel) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(sel as string[]).map((id) => <Chip key={id} size="small" label={nameOf(id)} />)}
                </Box>
              )}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  <Checkbox checked={ids.indexOf(u.id) > -1} />
                  <ListItemText primary={`${u.firstName} ${u.lastName} (${u.email})`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>
            The first selected user becomes the primary owner.
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!ids.length || saving}>Assign</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignOwner;
