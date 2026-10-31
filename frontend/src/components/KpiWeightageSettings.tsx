import React from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Table, TableBody, TableCell, TableFooter, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { api } from '@services/api';

const errorText = (e: any) => e?.response?.data?.error || e?.message || 'Request failed';
const WEIGHT_TOTAL = 1;

interface Setting {
  metricKey: string;
  label: string;
  target: number;
  weight: number;
}

// Settings > KPI Weightage: the target and weightage of each daily KPI. The weightages must add up to 1.0.
export default function KpiWeightageSettings() {
  const [rows, setRows] = React.useState<Setting[]>([]);
  const [draft, setDraft] = React.useState<Record<string, { target: string; weight: string }>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = (list: Setting[]) => {
    setRows(list);
    setDraft(Object.fromEntries(list.map((r) => [r.metricKey, { target: String(r.target), weight: String(r.weight) }])));
  };

  React.useEffect(() => {
    api
      .getKpiWeights()
      .then((res) => load(res.data.data || []))
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  const total = rows.reduce((s, r) => s + (Number(draft[r.metricKey]?.weight) || 0), 0);
  const totalOk = Math.abs(total - WEIGHT_TOTAL) < 0.0001;

  const save = () => {
    setError('');
    setNotice('');
    const items = rows.map((r) => ({
      metricKey: r.metricKey,
      target: Number(draft[r.metricKey]?.target),
      weight: Number(draft[r.metricKey]?.weight),
    }));
    if (items.some((i) => !Number.isFinite(i.target) || i.target <= 0)) {
      setError('Each target must be a number above 0');
      return;
    }
    if (items.some((i) => !Number.isFinite(i.weight) || i.weight < 0 || i.weight > 1)) {
      setError('Each weightage must be a number from 0 to 1');
      return;
    }
    if (!totalOk) {
      setError(`The weightage must add up to ${WEIGHT_TOTAL.toFixed(1)} (it is now ${total.toFixed(2)})`);
      return;
    }
    setSaving(true);
    api
      .saveKpiWeights(items)
      .then((res) => {
        load(res.data.data || []);
        setNotice('Targets and weightage saved');
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        Each KPI's score is its weightage multiplied by the achieved value, capped at its target. The weightages must add up to 1.0.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      <Table size="small" sx={{ mb: 2, maxWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell>KPI</TableCell>
            <TableCell align="right" sx={{ width: 140 }}>Target</TableCell>
            <TableCell align="right" sx={{ width: 140 }}>Weightage</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.metricKey}>
              <TableCell>{r.label}</TableCell>
              <TableCell align="right">
                <TextField
                  size="small"
                  type="number"
                  value={draft[r.metricKey]?.target ?? ''}
                  onChange={(e) => setDraft({ ...draft, [r.metricKey]: { ...draft[r.metricKey], target: e.target.value } })}
                  inputProps={{ min: 0, step: 'any', 'aria-label': `${r.label} target` }}
                  sx={{ width: 110 }}
                />
              </TableCell>
              <TableCell align="right">
                <TextField
                  size="small"
                  type="number"
                  value={draft[r.metricKey]?.weight ?? ''}
                  onChange={(e) => setDraft({ ...draft, [r.metricKey]: { ...draft[r.metricKey], weight: e.target.value } })}
                  inputProps={{ min: 0, max: 1, step: 'any', 'aria-label': `${r.label} weightage` }}
                  sx={{ width: 110 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              <Typography variant="subtitle2">Total weightage</Typography>
            </TableCell>
            <TableCell />
            <TableCell align="right">
              <Typography variant="subtitle2" color={totalOk ? 'success.main' : 'error.main'}>
                {total.toFixed(2)}
              </Typography>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <Stack direction="row">
        <Button variant="contained" onClick={save} disabled={saving || !totalOk}>
          {saving ? 'Saving...' : 'Save targets and weightage'}
        </Button>
      </Stack>
    </Box>
  );
}
