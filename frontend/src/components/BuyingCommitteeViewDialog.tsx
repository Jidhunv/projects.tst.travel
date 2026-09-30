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

// The 8 fixed buying-committee roles - must match backend
// utils/constants.ts#STAKEHOLDER_ROLES exactly.
const STAKEHOLDER_ROLES = [
  'Champion',
  'Coach',
  'Blocker',
  'Decision Maker',
  'Influencer',
  'Economic Buyer',
  'End User',
  'Gatekeeper',
];

interface BuyingCommitteeViewDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: string | null;
  accountName?: string;
}

// Read-only view of an account's buying-committee mapping. Editing stays on
// the Accounts page (Prospects > Buying Committee) - this is just for quickly
// checking who the stakeholders are while working a lead or opportunity.
export default function BuyingCommitteeViewDialog({ open, onClose, accountId, accountName }: BuyingCommitteeViewDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open || !accountId) return;
    setLoading(true);
    setError('');
    api.getAccountStakeholders(accountId)
      .then((res) => {
        const data: any[] = res.data.data || [];
        const byRole = new Map(data.map((s) => [s.role, s]));
        setRows(STAKEHOLDER_ROLES.map((role) => byRole.get(role) || { role }));
      })
      .catch((e: any) => setError(e.response?.data?.error || 'Failed to load buying committee'))
      .finally(() => setLoading(false));
  }, [open, accountId]);

  const filledCount = rows.filter((r) => r.name && r.designationId).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${filledCount}/8 mapped`}
                size="small"
                color={filledCount === 8 ? 'success' : 'warning'}
              />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Role</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Designation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.role}</TableCell>
                    <TableCell>{r.name || '-'}</TableCell>
                    <TableCell>{r.designation?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
