/**
 * Reusable Form Field Component
 */

import React from 'react';
import { TextField, MenuItem } from '@mui/material';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  select?: boolean;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  multiline = false,
  rows = 4,
  select = false,
  options = [],
  disabled = false
}) => {
  return (
    <TextField
      fullWidth
      name={name}
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      error={Boolean(error)}
      helperText={error}
      required={required}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      select={select}
      disabled={disabled}
      variant="outlined"
      margin="normal"
    >
      {select &&
        options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
    </TextField>
  );
};
