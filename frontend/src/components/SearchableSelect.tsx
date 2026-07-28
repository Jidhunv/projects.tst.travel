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
}) => {
  const selectedOption = options.find((opt) => opt.id === value) || null;

  return (
    <Autocomplete
      fullWidth
      options={options}
      getOptionLabel={(option) => option.name || ''}
      value={selectedOption}
      onChange={(_, newValue) => {
        onChange(newValue?.id || null);
      }}
      disabled={disabled || loading}
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
