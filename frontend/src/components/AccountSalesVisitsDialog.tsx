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
} from '@mui/material';
import { api } from '@services/api';

interface AccountSalesVisitsDialogProps {
  open: boolean;
  onClose: () => void;
  accountId: string | null;
  accountName?: string;
}

// Read-only list of the sales visits logged against an account. Visits are
// recorded on the Sales Visits page; this is for checking the account's visit
// history while working one of its opportunities.
export default function AccountSalesVisitsDialog({ open, onClose, accountId, accountName }: AccountSalesVisitsDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open || !accountId) return;
    setLoading(true);
    setError('');
    api.getSalesVisits({ accountId })
      .then((res) => setRows(res.data.data || []))
      .catch((e: any) => setError(e.response?.data?.error || 'Failed to load sales visits'))
      .finally(() => setLoading(false));
  }, [open, accountId]);

  const followupLabel = (visit: any) => {
    if (!visit.followupDate) return '-';
    const date = new Date(visit.followupDate).toLocaleDateString();
    return visit.followupCompleted ? `${date} (done)` : `${date} (open)`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Sales Visits{accountName ? ` — ${accountName}` : ''}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {!accountId ? (
          <Typography color="text.secondary">This opportunity has no account, so there are no visits to show.</Typography>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">No sales visits have been logged for this account yet.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Visit date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Discussion</TableCell>
                <TableCell>Follow-up</TableCell>
                <TableCell>Logged by</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell>{visit.visitDate ? new Date(visit.visitDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{visit.visitType || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{visit.discussion || '-'}</TableCell>
                  <TableCell>{followupLabel(visit)}</TableCell>
                  <TableCell>
                    {visit.createdBy ? `${visit.createdBy.firstName || ''} ${visit.createdBy.lastName || ''}`.trim() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
