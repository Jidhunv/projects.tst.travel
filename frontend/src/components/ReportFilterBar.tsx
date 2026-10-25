import React from 'react';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { api } from '@services/api';

// One filter set per report. Every report on the Reports page owns its own copy.
export interface ReportFilters {
  from: string;
  to: string;
  salespersonId: string;
  country: string;
  region: string;
  search: string;
}

export const EMPTY_REPORT_FILTERS: ReportFilters = { from: '', to: '', salespersonId: '', country: '', region: '', search: '' };

export type ReportFilterField = 'dates' | 'salesperson' | 'country' | 'region' | 'search';

export interface ReportOptions {
  people: { id: string; name: string }[];
  countries: string[];
  regions: string[];
  // False when the viewer may only see their own records: the salesperson dropdown is then hidden.
  canViewOthers: boolean;
}

const NO_OPTIONS: ReportOptions = { people: [], countries: [], regions: [], canViewOthers: false };

// Loads the people, countries and regions this viewer may filter by (Reports visibility rules).
export function useReportOptions(): { options: ReportOptions; error: string } {
  const [options, setOptions] = React.useState<ReportOptions>(NO_OPTIONS);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    api.getSalesActivityOptions({ module: 'reports' })
      .then((r) => setOptions({ ...NO_OPTIONS, ...r.data.data }))
      .catch((e: any) => setError(e.response?.data?.error || 'Could not load the filter lists'));
  }, []);
  return { options, error };
}

// Query parameters for a report. Lists read ownerId and fromDate/toDate; the summary
// endpoints read salespersonId and from/to. Both are sent so every endpoint finds what it needs.
export function reportParams(f: ReportFilters): Record<string, string> {
  const p: Record<string, string> = {};
  const put = (key: string, value: string) => { if (value) p[key] = value; };
  put('from', f.from);
  put('to', f.to);
  put('fromDate', f.from);
  put('toDate', f.to);
  put('salespersonId', f.salespersonId);
  put('ownerId', f.salespersonId);
  put('country', f.country);
  put('region', f.region);
  put('search', f.search);
  return p;
}

interface Props {
  value: ReportFilters;
  onChange: (next: ReportFilters) => void;
  options: ReportOptions;
  fields?: ReportFilterField[];
}

const ALL_FIELDS: ReportFilterField[] = ['dates', 'salesperson', 'country', 'region', 'search'];

export default function ReportFilterBar({ value, onChange, options, fields = ALL_FIELDS }: Props) {
  const has = (f: ReportFilterField) => fields.includes(f);
  const showSalesperson = has('salesperson') && options.canViewOthers;
  const set = (patch: Partial<ReportFilters>) => onChange({ ...value, ...patch });

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {has('search') && (
        <TextField size="small" label="Search" value={value.search} onChange={(e) => set({ search: e.target.value })} />
      )}
      {has('dates') && (
        <>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={value.from} onChange={(e) => set({ from: e.target.value })} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={value.to} onChange={(e) => set({ to: e.target.value })} />
        </>
      )}
      {showSalesperson && (
        <TextField size="small" select label="Salesperson" sx={{ minWidth: 200 }} value={value.salespersonId} onChange={(e) => set({ salespersonId: e.target.value })}>
          <MenuItem value="">Everyone I can see</MenuItem>
          {options.people.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
      )}
      {has('country') && (
        <TextField size="small" select label="Country" sx={{ minWidth: 170 }} value={value.country} onChange={(e) => set({ country: e.target.value })}>
          <MenuItem value="">All countries</MenuItem>
          {options.countries.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      )}
      {has('region') && (
        <TextField size="small" select label="Region" sx={{ minWidth: 170 }} value={value.region} onChange={(e) => set({ region: e.target.value })}>
          <MenuItem value="">All regions</MenuItem>
          {options.regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      )}
      <Box>
        <Button onClick={() => onChange(EMPTY_REPORT_FILTERS)}>Clear</Button>
      </Box>
    </Stack>
  );
}
