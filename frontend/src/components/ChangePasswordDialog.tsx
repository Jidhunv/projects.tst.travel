import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import { apiClient } from '../services/api';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

const PASSWORD_REQUIREMENTS = [
  'At least 8 characters long',
  'Contains uppercase letter (A-Z)',
  'Contains lowercase letter (a-z)',
  'Contains number (0-9)',
  'Contains special character (!@#$%^&*)',
];

export default function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validateNewPassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      errors.push('Password must contain special character');

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const passwordValidation = validateNewPassword(newPassword);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordValidation.valid) {
      setError('New password does not meet requirements');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess('Password changed successfully');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <TextField
          fullWidth
          type="password"
          label="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          sx={{ mb: 3 }}
        />

        {newPassword && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Password Requirements:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {PASSWORD_REQUIREMENTS.map((req, idx) => {
                const isValid = passwordValidation.valid ||
                  (req === 'At least 8 characters long' && newPassword.length >= 8) ||
                  (req === 'Contains uppercase letter (A-Z)' && /[A-Z]/.test(newPassword)) ||
                  (req === 'Contains lowercase letter (a-z)' && /[a-z]/.test(newPassword)) ||
                  (req === 'Contains number (0-9)' && /\d/.test(newPassword)) ||
                  (req === 'Contains special character (!@#$%^&*)' && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword));

                return (
                  <Typography
                    key={idx}
                    variant="body2"
                    sx={{
                      color: isValid ? 'success.main' : 'text.secondary',
                      textDecoration: isValid ? 'line-through' : 'none',
                    }}
                  >
                    ✓ {req}
                  </Typography>
                );
              })}
            </Box>
            <LinearProgress
              variant="determinate"
              value={(passwordValidation.valid ? 100 : Object.values(passwordValidation).filter((v) => v).length * 20)}
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !passwordValidation.valid || !currentPassword || newPassword !== confirmPassword}
        >
          {loading ? 'Changing...' : 'Change Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
