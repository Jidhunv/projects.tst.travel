import React from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, FormControlLabel, Grid, MenuItem, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import Layout from '@components/Layout';
import { api } from '@services/api';

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const errorText = (e: any) => e?.response?.data?.error || e?.message || 'Request failed';
const formatPercent = (n: number) => `${(Math.round(n * 1000) / 10).toFixed(1)}%`;
const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const formatStamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '');

// Combined view of one person across the range. Targets and achieved values are added up day by day, so a target of
// 3 over 5 days becomes 15. A KPI's achieved share is its total capped at its total target, and the weightage is the
// KPI's weight times that share. The supervisor total uses the entered value, or the CRM value on days with none.
// countedDays is the number of days the target is multiplied by. It can be lower than the range (for example 4
// when a weekend falls in the range, or 25 for a month); the achieved values always add up every day in the range.
function combinePerson(userId: string, days: any[], settings: any[], countedDays: number) {
  let name = 'Unknown user';
  let approvedDays = 0;
  let presentDays = 0;
  let lastUpdatedAt: string | null = null;
  const totals: Record<string, { targetPerDay: number; auto: number; supervisorEntered: number; enteredCount: number; supervisorForScore: number; names: string[] }> = {};
  for (const s of settings) {
    totals[s.metricKey] = { targetPerDay: 0, auto: 0, supervisorEntered: 0, enteredCount: 0, supervisorForScore: 0, names: [] };
  }
  for (const day of days) {
    const p = day.people.find((x: any) => x.userId === userId);
    if (!p) continue;
    presentDays++;
    name = p.name;
    if (p.approvedAt) approvedDays++;
    if (p.lastUpdatedAt && (!lastUpdatedAt || p.lastUpdatedAt > lastUpdatedAt)) lastUpdatedAt = p.lastUpdatedAt;
    for (const s of settings) {
      const m = p.metrics[s.metricKey];
      if (!m) continue;
      const t = totals[s.metricKey];
      // A person's target is the same every day, so the daily target is taken from the last day seen.
      t.targetPerDay = m.target;
      t.auto += m.auto;
      if (m.supervisor !== null && m.supervisor !== undefined) {
        t.supervisorEntered += m.supervisor;
        t.enteredCount++;
      }
      t.supervisorForScore += m.supervisor ?? m.auto;
      t.names.push(...(m.names || []));
    }
  }
  const metrics: Record<string, any> = {};
  let autoScore = 0;
  let supervisorScore = 0;
  for (const s of settings) {
    const t = totals[s.metricKey];
    const target = t.targetPerDay * countedDays;
    const autoShare = target > 0 ? Math.min(t.auto / target, 1) : 0;
    const supShare = target > 0 ? Math.min(t.supervisorForScore / target, 1) : 0;
    autoScore += s.weight * autoShare;
    supervisorScore += s.weight * supShare;
    metrics[s.metricKey] = {
      target,
      auto: t.auto,
      supervisor: t.enteredCount > 0 ? t.supervisorEntered : null,
      note: null,
      updatedAt: null,
      names: t.names,
    };
  }
  return { userId, name, dayCount: countedDays, approvedDays, presentDays, lastUpdatedAt, metrics, autoScore, supervisorScore };
}

// Daily KPI verification in the My KPI sheet layout. Achieved values come from the CRM. The supervisor enters
// a value and remarks beside each KPI, and approves the day. Each KPI's score is its weightage times the
// achieved value capped at its target.
export default function KpiVerificationPage() {
  const today = toIsoDate(new Date());
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  // '' means all staff the viewer is allowed to see.
  const [staffId, setStaffId] = React.useState('');
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  // Combined: one total per person for the whole range instead of a card for each day.
  const [combined, setCombined] = React.useState(false);
  // Days the combined targets are multiplied by. Blank means every day in the range.
  const [combinedDays, setCombinedDays] = React.useState('');

  const load = React.useCallback((start: string, end: string, staff: string) => {
    setLoading(true);
    setError('');
    api
      .getKpiDays({ from: start, to: end, ...(staff ? { userId: staff } : {}) })
      .then((res) => setData(res.data.data))
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load(from, to, staffId);
    // Loads the day shown on open; the Show button applies a new range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canVerify = (userId: string) => data?.canVerify === 'all' || (Array.isArray(data?.canVerify) && data.canVerify.includes(userId));

  // Reloads the range after a change so the scores and timestamps are current.
  const reload = () => api.getKpiDays({ from, to, ...(staffId ? { userId: staffId } : {}) }).then((res) => setData(res.data.data));

  const saveValue = (userId: string, day: string, metricKey: string, value: string, note: string) => {
    setError('');
    setNotice('');
    api
      .saveKpiSupervisorValue({ userId, day, metricKey, value: value === '' ? null : value, note })
      .then(() => {
        setNotice('Saved');
        return reload();
      })
      .catch((e) => setError(errorText(e)));
  };

  // Unlocking needs the kpi_verification delete permission; the server checks it too.
  const unlock = (userId: string, day: string) => {
    setError('');
    setNotice('');
    api
      .unlockKpiDay({ userId, day })
      .then(() => {
        setNotice('Day unlocked');
        return reload();
      })
      .catch((e) => setError(errorText(e)));
  };

  const approve = (userId: string, day: string) => {
    setError('');
    setNotice('');
    api
      .approveKpiDay({ userId, day })
      .then(() => {
        setNotice('Day approved');
        return reload();
      })
      .catch((e) => setError(errorText(e)));
  };

  return (
    <Layout>
      <Typography variant="h4" sx={{ mb: 1 }}>
        KPI Verification
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        Achieved values are calculated from the CRM. Supervisors enter their own value and remarks beside each KPI,
        and approve the day. Targets and weightage are set in Settings.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
        <TextField label="From" type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="To" type="date" size="small" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField
          select
          label="Staff"
          size="small"
          value={staffId}
          onChange={(e) => {
            setStaffId(e.target.value);
            load(from, to, e.target.value);
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All staff</MenuItem>
          {(data?.staff || []).map((st: any) => (
            <MenuItem key={st.userId} value={st.userId}>
              {st.name}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={() => load(from, to, staffId)} disabled={loading}>
          Show
        </Button>
        <FormControlLabel
          control={<Checkbox checked={combined} onChange={(e) => setCombined(e.target.checked)} />}
          label="Combined"
        />
      </Stack>

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

      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {data && !loading && data.days.every((d: any) => d.people.length === 0) && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No CRM activity or supervisor entries in this range.
        </Typography>
      )}

      {combined && data && !loading && data.days.length > 0 && (
        <Box sx={{ mb: 4 }}>
          {(() => {
            const rangeDays: number = data.days.length;
            const typed = Math.floor(Number(combinedDays));
            const countedDays = combinedDays !== '' && typed >= 1 ? typed : rangeDays;
            return (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }} alignItems={{ sm: 'center' }}>
                  <Typography variant="h6">
                    {formatDay(data.from)} to {formatDay(data.to)} ({rangeDays} {rangeDays === 1 ? 'day' : 'days'} in range)
                  </Typography>
                  <TextField
                    label="Days to count"
                    type="number"
                    size="small"
                    value={combinedDays}
                    placeholder={String(rangeDays)}
                    onChange={(e) => setCombinedDays(e.target.value)}
                    inputProps={{ min: 1, step: 1 }}
                    sx={{ width: 160 }}
                  />
                </Stack>
                <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                  Targets are multiplied by {countedDays} {countedDays === 1 ? 'day' : 'days'}. Achieved values add up every
                  day in the range. Leave the field blank to count every day. Enter fewer days to take out weekends or
                  days off, or 25 for a month. Supervisor values and approvals are entered day by day: switch Combined off
                  to change them.
                </Typography>
              </>
            );
          })()}
          {(() => {
            const userIds: string[] = [];
            const names = new Map<string, string>();
            for (const day of data.days) {
              for (const p of day.people) {
                if (!names.has(p.userId)) {
                  names.set(p.userId, p.name);
                  userIds.push(p.userId);
                }
              }
            }
            userIds.sort((a, b) => (names.get(a) || '').localeCompare(names.get(b) || ''));
            return userIds.map((userId) => {
              const typedDays = Math.floor(Number(combinedDays));
              const countedDays = combinedDays !== '' && typedDays >= 1 ? typedDays : data.days.length;
              const c = combinePerson(userId, data.days, data.settings || [], countedDays);
              return (
                <Card key={`combined-${userId}`} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {c.name}
                        </Typography>
                        {c.lastUpdatedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Last updated {formatStamp(c.lastUpdatedAt)}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Achieved weightage (CRM)</Typography>
                        <Typography variant="body1">{formatPercent(c.autoScore)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Achieved weightage (supervisor)</Typography>
                        <Typography variant="body1">{formatPercent(c.supervisorScore)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={2} sx={{ textAlign: { md: 'right' } }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={c.approvedDays === c.dayCount ? 'success' : 'default'}
                          label={`Approved ${c.approvedDays} of ${c.presentDays} ${c.presentDays === 1 ? 'day' : 'days'}`}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>KPI</TableCell>
                            <TableCell align="right">Target</TableCell>
                            <TableCell align="right">Achieved (CRM)</TableCell>
                            <TableCell align="right">Achieved of target</TableCell>
                            <TableCell align="right">Achieved weightage</TableCell>
                            <TableCell align="right">Supervisor</TableCell>
                            <TableCell>Remarks</TableCell>
                            <TableCell>Last updated</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(data.settings || []).map((s: any) => {
                            const m = c.metrics[s.metricKey];
                            return (
                              <MetricRow
                                key={`combined-${userId}-${s.metricKey}`}
                                label={s.label}
                                target={m.target}
                                weight={s.weight}
                                auto={m.auto}
                                supervisor={m.supervisor}
                                note={null}
                                updatedAt={null}
                                names={m.names}
                                editable={false}
                                onSave={() => {}}
                              />
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </Box>
      )}

      {!combined && data?.days.map((day: any) =>
        day.people.length === 0 ? null : (
          <Box key={day.day} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {formatDay(day.day)}
            </Typography>
            {day.people.map((p: any) => {
              const editable = canVerify(p.userId);
              return (
                <Card key={`${p.userId}-${day.day}`} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {p.name}
                        </Typography>
                        {p.lastUpdatedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Last updated {formatStamp(p.lastUpdatedAt)}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Average achieved weightage (CRM)</Typography>
                        <Typography variant="body1">{formatPercent(p.autoScore)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Average achieved weightage (supervisor)</Typography>
                        <Typography variant="body1">{formatPercent(p.supervisorScore)}</Typography>
                      </Grid>
                      <Grid item xs={12} md={2} sx={{ textAlign: { md: 'right' } }}>
                        {p.approvedAt ? (
                          <Stack spacing={1} alignItems={{ md: 'flex-end' }}>
                            <Chip size="small" color="success" label={`Approved ${formatStamp(p.approvedAt)}`} />
                            {data?.canUnlock && (
                              <Button size="small" variant="text" onClick={() => unlock(p.userId, day.day)}>
                                Unlock day
                              </Button>
                            )}
                          </Stack>
                        ) : editable ? (
                          <Button size="small" variant="outlined" onClick={() => approve(p.userId, day.day)}>
                            Approve day
                          </Button>
                        ) : (
                          <Chip size="small" variant="outlined" label="Pending approval" />
                        )}
                      </Grid>
                    </Grid>

                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>KPI</TableCell>
                            <TableCell align="right">Target</TableCell>
                            <TableCell align="right">Achieved (CRM)</TableCell>
                            <TableCell align="right">Achieved of target</TableCell>
                            <TableCell align="right">Achieved weightage</TableCell>
                            <TableCell align="right">Supervisor</TableCell>
                            <TableCell>Remarks</TableCell>
                            <TableCell>Last updated</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(data.settings || []).map((s: any) => {
                            const m = p.metrics[s.metricKey];
                            if (!m) return null;
                            return (
                              <MetricRow
                                key={`${p.userId}-${day.day}-${s.metricKey}-${m.supervisor ?? ''}-${m.note ?? ''}`}
                                label={s.label}
                                target={m.target}
                                weight={s.weight}
                                auto={m.auto}
                                supervisor={m.supervisor}
                                note={m.note}
                                updatedAt={m.updatedAt}
                                names={m.names || []}
                                editable={editable && !p.approvedAt}
                                onSave={(value, note) => saveValue(p.userId, day.day, s.metricKey, value, note)}
                              />
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )
      )}
    </Layout>
  );
}

interface MetricRowProps {
  label: string;
  target: number;
  weight: number;
  auto: number;
  supervisor: number | null;
  note: string | null;
  updatedAt: string | null;
  names: string[];
  editable: boolean;
  onSave: (value: string, note: string) => void;
}

// One KPI for one person-day. The supervisor's value and remarks are saved when the field loses focus.
function MetricRow({ label, target, weight, auto, supervisor, note, updatedAt, names, editable, onSave }: MetricRowProps) {
  // The share of the target reached, capped at 100%, and the weightage that share gives.
  const achievedShare = target > 0 ? Math.min(auto / target, 1) : 0;
  const [value, setValue] = React.useState(supervisor === null ? '' : String(supervisor));
  const [text, setText] = React.useState(note ?? '');

  const commit = () => {
    const savedValue = supervisor === null ? '' : String(supervisor);
    if (value !== savedValue || text !== (note ?? '')) onSave(value, text);
  };

  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell align="right">{target}</TableCell>
      <TableCell align="right">
        {names.length > 0 ? (
          <Tooltip
            title={
              <Box>
                {names.slice(0, 30).map((n, i) => (
                  <Typography key={i} variant="body2">{n}</Typography>
                ))}
                {names.length > 30 && <Typography variant="body2">+{names.length - 30} more</Typography>}
              </Box>
            }
          >
            <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>{auto}</span>
          </Tooltip>
        ) : (
          auto
        )}
      </TableCell>
      <TableCell align="right">{formatPercent(achievedShare)}</TableCell>
      <TableCell align="right">{formatPercent(weight * achievedShare)}</TableCell>
      <TableCell align="right" sx={{ width: 130 }}>
        <Tooltip title={editable ? '' : 'Only the supervisor can enter this value'}>
          <span>
            <TextField
              size="small"
              type="number"
              value={value}
              disabled={!editable}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commit}
              inputProps={{ min: 0, step: 'any', 'aria-label': `${label} supervisor value` }}
              sx={{ width: 110 }}
            />
          </span>
        </Tooltip>
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          value={text}
          disabled={!editable}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          inputProps={{ maxLength: 500, 'aria-label': `${label} remarks` }}
        />
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography variant="body2" color="text.secondary">{formatStamp(updatedAt)}</Typography>
      </TableCell>
    </TableRow>
  );
}
