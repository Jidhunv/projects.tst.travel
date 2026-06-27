import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
} from '@mui/material';
import { apiClient } from '../services/api';

interface FirstLoginPasswordChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
}

export const FirstLoginPasswordChangeDialog: React.FC<FirstLoginPasswordChangeDialogProps> = ({
  open,
  onClose,
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    calculatePasswordStrength(pwd);
    setError('');
  };

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password-first-login', {
        newPassword,
      });
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onPasswordChanged();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) &&
    newPassword === confirmPassword;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle>Change Your Password</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
          This is your first login. For security purposes, you must change your password before
          continuing.
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Password Requirements:
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
          • At least 8 characters
          <br />• At least one uppercase letter (A-Z)
          <br />• At least one lowercase letter (a-z)
          <br />• At least one number (0-9)
          <br />• At least one special character (!@#$%^&*)
        </Typography>

        <TextField
          fullWidth
          type="password"
          label="New Password"
          value={newPassword}
          onChange={handlePasswordChange}
          sx={{ mb: 2 }}
          disabled={loading}
        />

        {newPassword && (
          <>
            <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
              Password Strength: {passwordStrength}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={passwordStrength}
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />
          </>
        )}

        <TextField
          fullWidth
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          sx={{ mb: 2 }}
          disabled={loading}
          error={confirmPassword.length > 0 && newPassword !== confirmPassword}
          helperText={
            confirmPassword.length > 0 && newPassword !== confirmPassword
              ? 'Passwords do not match'
              : ''
          }
        />

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="contained" disabled={!isPasswordValid || loading}>
          {loading ? 'Changing Password...' : 'Change Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FirstLoginPasswordChangeDialog;
