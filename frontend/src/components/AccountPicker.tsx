import React from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { api } from '@services/api';

export interface AccountOption {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

interface AccountPickerProps {
  label: string;
  value: AccountOption | null;
  onChange: (account: AccountOption | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  minWidth?: number;
}

// Searchable company picker. It lists only the accounts the signed-in user can see (the accounts API applies
// the user's visibility), sorted by name, and searches the server as the user types, so any company can be found.
export default function AccountPicker({ label, value, onChange, disabled, required, error, helperText, size = 'small', minWidth }: AccountPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [options, setOptions] = React.useState<AccountOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Searches the server for the typed text, after a short pause so typing does not send a request per key.
  React.useEffect(() => {
    if (!open) return undefined;
    let live = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      api
        .getAccounts(1, 50, { search: input.trim() || undefined, sortBy: 'name', sortDir: 'asc' })
        .then((res) => {
          if (live) setOptions((res.data.data || []) as AccountOption[]);
        })
        .catch(() => {
          if (live) setOptions([]);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [open, input]);

  // The selected company is always shown, even when the current search results do not include it.
  const shown = value && !options.some((o) => o.id === value.id) ? [value, ...options] : options;

  return (
    <Autocomplete
      fullWidth={!minWidth}
      sx={minWidth ? { minWidth } : undefined}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={shown}
      value={value}
      inputValue={input}
      onInputChange={(_, text, reason) => {
        if (reason === 'input') setInput(text);
      }}
      onChange={(_, account) => {
        onChange(account);
        setInput('');
      }}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      filterOptions={(x) => x}
      loading={loading}
      disabled={disabled}
      noOptionsText={loading ? 'Searching...' : 'No company you can see matches this search'}
      renderOption={(props, o) => (
        <li {...props} key={o.id}>
          {o.name}
          {(o.city || o.country) && (
            <span style={{ marginLeft: 8, opacity: 0.6, fontSize: '0.85em' }}>
              {[o.city, o.country].filter(Boolean).join(', ')}
            </span>
          )}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size={size}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          placeholder="Type to search companies"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
