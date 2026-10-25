import React from 'react';
import { Autocomplete, Box, Chip, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';

// Mirrors backend utils/prospecting.ts. The server is the authority on validation.
export const PROSPECT_TIERS = ['T1', 'T2', 'T3', 'T4', 'T5'];
export const PROSPECT_SOURCES = ['Referral', 'Website', 'Event', 'Database', 'Inbound enquiry', 'Other'];

export interface ProspectOptionSets {
  businessType: string[];
  employeeBand: string[];
}

export interface ProspectAnswers {
  name?: string;
  website?: string;
  location?: { country: string; region: string; city: string };
  industry?: string;
  tier?: string;
  contact?: { name?: string; designation?: string; email?: string; phone?: string };
  businessTypes?: string[];
  employeeBands?: string[];
  branches?: string[];
  source?: string;
  verification?: { verifiedOn?: string; source?: string };
  duplicates?: string;
}

// Account fields that the questionnaire starts from. Shown as "from basic info" until overwritten.
export interface BasicInfo {
  name?: string | null;
  website?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  industry?: string | null;
  tier?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  ownerName?: string | null;
}

interface Props {
  value: ProspectAnswers;
  onChange: (next: ProspectAnswers) => void;
  options: ProspectOptionSets;
  basic: BasicInfo;
}

const LF = String.fromCharCode(10);

const fromBasic = (typed: unknown, basic: unknown) => (typeof typed === 'string' && typed.trim() ? '' : basic ? 'From basic info' : '');

const ProspectingQuestionnaire: React.FC<Props> = ({ value, onChange, options, basic }) => {
  const set = (patch: ProspectAnswers) => onChange({ ...value, ...patch });
  const loc = value.location ?? { country: '', region: '', city: '' };
  const contact = value.contact ?? {};
  const verification = value.verification ?? {};

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Lead questionnaire</Typography>
        <Typography variant="caption" color="text.secondary">
          Filled from basic info where it is already known. Every question is mandatory: an account is a prospect,
          and can be converted into a lead, only when all of them are complete.
        </Typography>
      </Box>

      <TextField label="Company name (legal or trading)" value={value.name ?? basic.name ?? ''}
        helperText={fromBasic(value.name, basic.name)} onChange={(e) => set({ name: e.target.value })} fullWidth />
      <TextField label="Website or verifiable business profile" value={value.website ?? basic.website ?? ''}
        helperText={fromBasic(value.website, basic.website)} onChange={(e) => set({ website: e.target.value })} fullWidth />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Country" value={loc.country || basic.country || ''} fullWidth
          helperText={fromBasic(loc.country, basic.country)}
          onChange={(e) => set({ location: { ...loc, country: e.target.value } })} />
        <TextField label="Region" value={loc.region || basic.region || ''} fullWidth
          helperText={fromBasic(loc.region, basic.region)}
          onChange={(e) => set({ location: { ...loc, region: e.target.value } })} />
        <TextField label="City" value={loc.city || basic.city || ''} fullWidth
          helperText={fromBasic(loc.city, basic.city)}
          onChange={(e) => set({ location: { ...loc, city: e.target.value } })} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Industry" value={value.industry ?? basic.industry ?? ''} fullWidth
          helperText={fromBasic(value.industry, basic.industry)} onChange={(e) => set({ industry: e.target.value })} />
        <TextField select label="Tier" value={value.tier ?? basic.tier ?? ''} fullWidth
          helperText={basic.tier ? 'From basic info' : 'Required: not set in basic info'}
          onChange={(e) => set({ tier: e.target.value })}>
          <MenuItem value="">-- Select tier --</MenuItem>
          {PROSPECT_TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Stack>

      <Autocomplete multiple options={options.businessType} value={value.businessTypes ?? []}
        onChange={(_, v) => set({ businessTypes: v })}
        renderTags={(v, getTagProps) => v.map((o, i) => <Chip size="small" label={o} {...getTagProps({ index: i })} key={o} />)}
        renderInput={(p) => <TextField {...p} label="Business type" helperText="Retail, B2B, Corporate, or a combination" />} />

      <Autocomplete multiple options={options.employeeBand} value={value.employeeBands ?? []}
        onChange={(_, v) => set({ employeeBands: v })}
        renderTags={(v, getTagProps) => v.map((o, i) => <Chip size="small" label={o} {...getTagProps({ index: i })} key={o} />)}
        renderInput={(p) => <TextField {...p} label="Number of employees" helperText="Choose the band(s) that apply" />} />

      <TextField label="Branches" multiline minRows={2} value={(value.branches ?? []).join(LF)}
        helperText="One branch per line (city or office name)"
        onChange={(e) => set({ branches: e.target.value.split(LF).map((b) => b.trim()).filter(Boolean) })} />

      <Divider />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>Primary business contact</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Name" value={contact.name ?? basic.contactPerson ?? ''} fullWidth
          helperText={fromBasic(contact.name, basic.contactPerson)}
          onChange={(e) => set({ contact: { ...contact, name: e.target.value } })} />
        <TextField label="Designation" value={contact.designation ?? ''} fullWidth
          onChange={(e) => set({ contact: { ...contact, designation: e.target.value } })} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Email" type="email" value={contact.email ?? basic.email ?? ''} fullWidth
          helperText="Email or phone is required"
          onChange={(e) => set({ contact: { ...contact, email: e.target.value } })} />
        <TextField label="Phone" value={contact.phone ?? basic.phoneNumber ?? ''} fullWidth
          onChange={(e) => set({ contact: { ...contact, phone: e.target.value } })} />
      </Stack>

      <TextField label="Sales owner" value={basic.ownerName ?? ''} fullWidth disabled
        helperText="Set with Assign on the account. Required before the account can be a lead" />

      <TextField select label="Source of this account information" value={value.source ?? ''} fullWidth
        onChange={(e) => set({ source: e.target.value })}>
        <MenuItem value="">-- Select source --</MenuItem>
        {PROSPECT_SOURCES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Last verified on" type="date" InputLabelProps={{ shrink: true }} value={verification.verifiedOn ?? ''} fullWidth
          onChange={(e) => set({ verification: { ...verification, verifiedOn: e.target.value } })} />
        <TextField label="Verification source" value={verification.source ?? ''} fullWidth
          onChange={(e) => set({ verification: { ...verification, source: e.target.value } })} />
      </Stack>

      <TextField label="Lead notes" value={value.duplicates ?? ''} fullWidth multiline minRows={2}
        helperText="Notes on this lead, including any duplicate accounts or existing customer relationships. Write 'None' if there are none" onChange={(e) => set({ duplicates: e.target.value })} />
    </Stack>
  );
};

export default ProspectingQuestionnaire;
