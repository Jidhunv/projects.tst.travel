import React from 'react';
import { MenuItem, TextField } from '@mui/material';
import { api } from '@services/api';

interface Props {
  value: string;
  onChange: (userId: string) => void;
  label?: string;
}

// "Filter by staff name" drop-down for list pages. The staff list comes from /api/users, which
// only Admin/Manager-style roles may read; for anyone else the list is empty and the filter
// hides itself (those users only ever see their own records anyway).
export default function StaffFilter({ value, onChange, label = 'Staff' }: Props) {
  const [staff, setStaff] = React.useState<any[]>([]);

  React.useEffect(() => {
    let live = true;
    api.getUsers(1, 500)
      .then((r) => { if (live) setStaff([...(r.data.data || [])].sort((a: any, b: any) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))); })
      .catch(() => { if (live) setStaff([]); });
    return () => { live = false; };
  }, []);

  if (staff.length === 0) return null;
  return (
    <TextField size="small" select fullWidth label={label} sx={{ minWidth: 180 }} value={value} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">All staff</MenuItem>
      {staff.map((u) => <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</MenuItem>)}
    </TextField>
  );
}
