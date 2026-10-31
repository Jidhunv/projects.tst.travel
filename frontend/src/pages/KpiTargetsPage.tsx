import React from 'react';
import { Alert, Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, CircularProgress } from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';

const errorText = (e: any) => e?.response?.data?.error || e?.message || 'Request failed';

interface Setting {
  metricKey: string;
  label: string;
  target: number;
}

interface Person {
  userId: string;
  name: string;
  targets: Record<string, number | null>;
}

// Supervisors set each team member's daily target for each KPI. A blank target uses the default (1).
// The verification page picks up the new targets on its next load.
export default function KpiTargetsPage() {
  const [settings, setSettings] = React.useState<Setting[]>([]);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const load = React.useCallback(() => {
    setLoading(true);
    setError('');
    api
      .getKpiTargets()
      .then((res) => {
        const data = res.data.data;
        setSettings(data.settings || []);
        setPeople(data.people || []);
        setDrafts({});
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Saves one cell. A blank cell clears the person's target, so the default applies again.
  const save = (userId: string, metricKey: string, raw: string) => {
    const target = raw.trim() === '' ? null : Number(raw);
    setError('');
    setNotice('');
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      setError('A target must be a number above 0');
      return;
    }
    api
      .saveKpiTarget({ userId, metricKey, target })
      .then(() => {
        setNotice('Target saved');
        load();
      })
      .catch((e) => setError(errorText(e)));
  };

  return (
    <Layout>
      <Typography variant="h4" sx={{ mb: 1 }}>
        KPI Targets
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        Set each team member's daily target for each KPI, for example 4, 3 or 2. A blank cell uses the default target
        from Settings. Only supervisors and admins can change these.
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : people.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          There are no team members to set targets for.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Team member</TableCell>
                {settings.map((s) => (
                  <TableCell key={s.metricKey} align="center">
                    {s.label}
                    <Typography variant="caption" display="block" color="text.secondary">
                      default {s.target}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.userId}>
                  <TableCell>{p.name}</TableCell>
                  {settings.map((s) => {
                    const key = `${p.userId}|${s.metricKey}`;
                    const current = p.targets[s.metricKey];
                    return (
                      <TableCell key={s.metricKey} align="center">
                        <TextField
                          size="small"
                          type="number"
                          placeholder={String(s.target)}
                          value={drafts[key] ?? (current === null || current === undefined ? '' : String(current))}
                          onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                          onBlur={() => {
                            if (key in drafts) save(p.userId, s.metricKey, drafts[key]);
                          }}
                          inputProps={{ min: 0, step: 'any', 'aria-label': `${p.name} ${s.label} target` }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Layout>
  );
}
