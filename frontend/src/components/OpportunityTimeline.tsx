import React from 'react';
import { Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Button, Stack, Typography } from '@mui/material';
import { api } from '@services/api';

const errMsg = (e: any, fb: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fb;
const fmt = (v: any) => (v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const COLOR: Record<string, string> = {
  'Customer engagement': '#6366f1', Demonstration: '#0ea5e9', Proposal: '#f59e0b', Negotiation: '#f97316',
  'Closed-Won': '#10b981', Handover: '#0ea5e9', 'Closed-Lost': '#ef4444',
};

// Each stage a deal has been in: when it entered, when it left, how long it stayed, and who moved it.
export default function OpportunityTimeline({ opportunityId, opportunityName, onClose }: { opportunityId: string; opportunityName: string; onClose: () => void }) {
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.getStageHistory(opportunityId)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(errMsg(e, 'Could not load the timeline')))
      .finally(() => setLoading(false));
  }, [opportunityId]);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Stage timeline — {opportunityName}</DialogTitle>
      <DialogContent>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {data && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Now: ${data.stage}`} color="primary" />
              <Chip size="small" variant="outlined" label={`Opened ${fmt(data.createdAt)}`} />
              <Chip size="small" variant="outlined" label={`${data.totalDays} days in total`} />
            </Stack>
            {data.entries.length === 0 && <Typography variant="body2" color="text.secondary">No stage moves recorded yet.</Typography>}
            <Box sx={{ position: 'relative', pl: 3 }}>
              <Box sx={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 2, bgcolor: 'divider' }} />
              {data.entries.map((e: any) => (
                <Box key={e.id} sx={{ position: 'relative', mb: 2.5 }}>
                  <Box sx={{ position: 'absolute', left: -24, top: 4, width: 14, height: 14, borderRadius: '50%', bgcolor: COLOR[e.stage] || '#64748b', border: 2, borderColor: 'background.paper' }} />
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle2" fontWeight={700}>{e.stage}</Typography>
                    {e.current && <Chip size="small" color="primary" label="Current" />}
                    <Typography variant="caption" color="text.secondary">{e.days} days{e.current ? ' so far' : ''}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Entered {fmt(e.enteredAt)}{e.leftAt ? ` · left ${fmt(e.leftAt)}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {e.actorName ? `Moved by ${e.actorName}` : 'Moved by an unknown user'}{e.note ? ` · ${e.note}` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
