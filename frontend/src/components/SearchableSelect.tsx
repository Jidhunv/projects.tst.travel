import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';

interface SearchableSelectProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  options: Array<{ id: string; name: string; [key: string]: any }>;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  // When set the options are searched on the server: called as the user types.
  onSearch?: (query: string) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  loading = false,
  placeholder,
  helperText,
  error = false,
  onSearch,
}) => {
  const selectedOption = options.find((opt) => opt.id === value) || null;

  return (
    <Autocomplete
      fullWidth
      options={options}
      filterOptions={onSearch ? (x) => x : undefined}
      onInputChange={onSearch ? (_, v, reason) => { if (reason === 'input') onSearch(v); else if (reason === 'clear') onSearch(''); } : undefined}
      getOptionLabel={(option) => option.name || ''}
      value={selectedOption}
      onChange={(_, newValue) => {
        onChange(newValue?.id || null);
      }}
      // With server-side search the list reloads on every keystroke; disabling then would drop focus.
      disabled={disabled || (loading && !onSearch)}
      loading={loading}
      noOptionsText="No options"
      sx={{ mb: 2 }}
      slotProps={{
        paper: {
          sx: { maxHeight: '300px' },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default SearchableSelect;
