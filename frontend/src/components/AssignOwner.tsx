import React, { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, TextField,
} from '@mui/material';
import { api } from '@services/api';
import useAuth from '@hooks/useAuth';

type Module = 'leads' | 'accounts' | 'opportunities' | 'tickets';

interface Props {
  module: Module;
  recordId: string;
  currentOwnerId?: string;
  onAssigned?: () => void;
  size?: 'small' | 'medium';
}

// Small "Assign" button + dialog to reassign a record to another user.
// Renders nothing unless the current user is allowed to reassign this module.
export const AssignOwner: React.FC<Props> = ({ module, recordId, currentOwnerId, onAssigned, size = 'small' }) => {
  const canReassign = useAuth((s) => s.canReassign);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [ownerId, setOwnerId] = useState(currentOwnerId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && users.length === 0) {
      api.getUsers(1, 200).then((r) => setUsers(r.data.data || [])).catch(() => {});
    }
  }, [open]);

  if (!canReassign(module)) return null;

  const assignFn: Record<Module, (id: string, owner: string) => Promise<any>> = {
    leads: api.assignLead,
    accounts: api.assignAccount,
    opportunities: api.assignOpportunity,
    tickets: api.assignTicket,
  };

  const save = async () => {
    if (!ownerId) return;
    setSaving(true);
    try {
      await assignFn[module](recordId, ownerId);
      setOpen(false);
      onAssigned?.();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to reassign');
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
        <DialogTitle>Assign to user</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth label="Owner" sx={{ mt: 1 }}
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          >
            <MenuItem value="">-- Select user --</MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.email})
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!ownerId || saving}>Assign</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignOwner;
