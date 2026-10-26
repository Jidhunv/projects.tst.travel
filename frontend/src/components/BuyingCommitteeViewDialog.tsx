import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import { api } from '@services/api';
import BuyingCommitteeEditor, {
  STAKEHOLDER_ROLES,
  CommitteeForm,
  committeeError,
  committeeFormFromRows,
  committeePayload,
  emptyCommitteeForm,
} from '@components/BuyingCommitteeEditor';

interface BuyingCommitteeViewDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: string | null;
  accountName?: string;
}

// Buying committee for an account. Opens read-only; "Edit" switches to the editor
// and "Save" writes the committee back to the account. The same dialog is used from
// Prospects and Opportunities, so the committee can be amended from either screen.
export default function BuyingCommitteeViewDialog({ open, onClose, accountId, accountName }: BuyingCommitteeViewDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<CommitteeForm>(emptyCommitteeForm());
  const [designations, setDesignations] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');

  const load = React.useCallback(() => {
    if (!accountId) return;
    setLoading(true);
    setError('');
    api.getAccountStakeholders(accountId)
      .then((res) => {
        const data: any[] = res.data.data || [];
        const byRole = new Map(data.map((s) => [s.role, s]));
        setRows(STAKEHOLDER_ROLES.map((role) => byRole.get(role) || { role }));
        setForm(committeeFormFromRows(data));
      })
      .catch((e: any) => setError(e.response?.data?.error || 'Failed to load buying committee'))
      .finally(() => setLoading(false));
  }, [accountId]);

  React.useEffect(() => {
    if (!open) return;
    setEditing(false);
    setSaveError('');
    load();
  }, [open, load]);

  const startEdit = () => {
    setSaveError('');
    setEditing(true);
    api.getDesignations({ isActive: true })
      .then((res) => setDesignations(res.data.data || []))
      .catch(() => setDesignations([]));
  };

  const save = () => {
    if (!accountId) return;
    const problem = committeeError(form);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaving(true);
    setSaveError('');
    api.saveAccountStakeholders(accountId, committeePayload(form))
      .then(() => {
        setEditing(false);
        load();
      })
      .catch((e: any) => setSaveError(e.response?.data?.error || 'Failed to save buying committee'))
      .finally(() => setSaving(false));
  };

  // A role counts as mapped once it has a named member (email and phone are required with a name).
  const filledCount = rows.filter((r) => r.name).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Buying Committee{accountName ? ` — ${accountName}` : ''}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : editing ? (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Map a person to each role. A named member needs an email and a phone number.
            </Typography>
            <BuyingCommitteeEditor value={form} onChange={setForm} designations={designations} />
            {saveError && <Typography color="error" sx={{ mt: 2 }}>{saveError}</Typography>}
          </>
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${filledCount}/8 named`}
                size="small"
                color={filledCount === 8 ? 'success' : 'warning'}
              />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Role</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Designation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.role}</TableCell>
                    <TableCell>{r.name || '-'}</TableCell>
                    <TableCell>{r.email || '-'}</TableCell>
                    <TableCell>{r.phone || '-'}</TableCell>
                    <TableCell>{r.designation?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Close</Button>
            {accountId && !loading && !error && (
              <Button variant="contained" onClick={startEdit}>Edit</Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
