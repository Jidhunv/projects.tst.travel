import React from 'react';
import { Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';

// The eight fixed buying-committee roles. Mirrors utils/constants.ts#STAKEHOLDER_ROLES
// on the backend, which rejects any other role.
export const STAKEHOLDER_ROLES = [
  'Champion',
  'Coach',
  'Blocker',
  'Decision Maker',
  'Influencer',
  'Economic Buyer',
  'End User',
  'Gatekeeper',
] as const;

export interface CommitteeMemberForm {
  name: string;
  email: string;
  phone: string;
  designationId: string;
}

export type CommitteeForm = Record<string, CommitteeMemberForm>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emptyCommitteeForm = (): CommitteeForm =>
  Object.fromEntries(STAKEHOLDER_ROLES.map((role) => [role, { name: '', email: '', phone: '', designationId: '' }]));

// Builds the form from saved committee rows (as returned by the API).
export const committeeFormFromRows = (rows: any[]): CommitteeForm => {
  const byRole = new Map(rows.map((r) => [r.role, r]));
  return Object.fromEntries(
    STAKEHOLDER_ROLES.map((role) => {
      const r = byRole.get(role);
      return [role, {
        name: r?.name || '',
        email: r?.email || '',
        phone: r?.phone || '',
        designationId: r?.designationId || '',
      }];
    })
  );
};

// First problem with the form, or null. A named member must also have an email
// and a phone, so the committee can always be reached.
export const committeeError = (form: CommitteeForm): string | null => {
  for (const role of STAKEHOLDER_ROLES) {
    const m = form[role];
    if (!m || !m.name.trim()) continue;
    if (!m.email.trim() || !m.phone.trim()) {
      return `${role} (${m.name.trim()}) needs an email and a phone number`;
    }
    if (!EMAIL_RE.test(m.email.trim())) {
      return `${role} (${m.name.trim()}) has an invalid email`;
    }
  }
  return null;
};

// Payload for PUT /accounts/:id/stakeholders. Blank rows clear that role on the server.
export const committeePayload = (form: CommitteeForm) =>
  STAKEHOLDER_ROLES.map((role) => ({
    role,
    name: form[role]?.name.trim() || '',
    email: form[role]?.email.trim() || '',
    phone: form[role]?.phone.trim() || '',
    designationId: form[role]?.designationId || undefined,
  }));

interface EditorProps {
  value: CommitteeForm;
  onChange: (next: CommitteeForm) => void;
  // Passing designations shows the designation picker (the account dialog uses it).
  designations?: any[];
}

// One row per role: name, email and phone, optionally a designation.
const BuyingCommitteeEditor: React.FC<EditorProps> = ({ value, onChange, designations }) => {
  const update = (role: string, field: keyof CommitteeMemberForm, input: string) =>
    onChange({ ...value, [role]: { ...value[role], [field]: input } });

  // Column widths add up to 12 with or without the designation picker.
  const w = designations
    ? { role: 2, name: 2.5, email: 2.5, phone: 2 }
    : { role: 3, name: 3, email: 3, phone: 3 };

  return (
    <Stack spacing={2}>
      {STAKEHOLDER_ROLES.map((role) => (
        <Grid container spacing={2} key={role} alignItems="center">
          <Grid item xs={12} sm={w.role}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{role}</Typography>
          </Grid>
          <Grid item xs={12} sm={w.name}>
            <TextField size="small" fullWidth label="Name" value={value[role]?.name || ''} onChange={(e) => update(role, 'name', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={w.email}>
            <TextField size="small" fullWidth label="Email" type="email" value={value[role]?.email || ''} onChange={(e) => update(role, 'email', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={w.phone}>
            <TextField size="small" fullWidth label="Phone" value={value[role]?.phone || ''} onChange={(e) => update(role, 'phone', e.target.value)} />
          </Grid>
          {designations && (
            <Grid item xs={12} sm={3}>
              <TextField
                size="small"
                select
                fullWidth
                label="Designation"
                value={value[role]?.designationId || ''}
                onChange={(e) => update(role, 'designationId', e.target.value)}
              >
                <MenuItem value="">-- None --</MenuItem>
                {designations.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      ))}
    </Stack>
  );
};

export default BuyingCommitteeEditor;
