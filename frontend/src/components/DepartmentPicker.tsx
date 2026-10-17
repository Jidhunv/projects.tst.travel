import React from 'react';
import { Box, Checkbox, FormControlLabel, FormGroup, FormHelperText, Typography } from '@mui/material';

// Must match DEPARTMENTS in backend/src/utils/departments.ts.
export const DEPARTMENTS = ['Sales', 'Operations', 'Development', 'Finance', 'Support'];

// Tick the functions a role or person works in. Development is what makes someone assignable to issues.
export default function DepartmentPicker({ value, onChange, label = 'Department', helperText }: { value: string[]; onChange: (v: string[]) => void; label?: string; helperText?: string }) {
  const toggle = (d: string, on: boolean) => onChange(on ? [...value.filter((x) => x !== d), d] : value.filter((x) => x !== d));
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
      <FormGroup row>
        {DEPARTMENTS.map((d) => (
          <FormControlLabel key={d} control={<Checkbox size="small" checked={value.includes(d)} onChange={(e) => toggle(d, e.target.checked)} />} label={d} />
        ))}
      </FormGroup>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </Box>
  );
}
