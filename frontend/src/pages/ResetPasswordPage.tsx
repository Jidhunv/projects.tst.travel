import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Container,
  LinearProgress,
} from '@mui/material';
import { apiClient } from '../services/api';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength>({ score: 0, label: '', color: '' });

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const calculateStrength = (pwd: string): PasswordStrength => {
    let score = 0;
    const checks = [
      pwd.length >= 8,
      /[A-Z]/.test(pwd),
      /[a-z]/.test(pwd),
      /\d/.test(pwd),
      /[!@#$%^&*]/.test(pwd),
    ];

    score = checks.filter(Boolean).length;

    const strengths: { [key: number]: PasswordStrength } = {
      0: { score: 0, label: 'Very Weak', color: '#d32f2f' },
      1: { score: 1, label: 'Weak', color: '#f57c00' },
      2: { score: 2, label: 'Fair', color: '#fbc02d' },
      3: { score: 3, label: 'Good', color: '#7cb342' },
      4: { score: 4, label: 'Strong', color: '#388e3c' },
      5: { score: 5, label: 'Very Strong', color: '#1b5e20' },
    };

    return strengths[score] || strengths[0];
  };

  useEffect(() => {
    setStrength(calculateStrength(password));
  }, [password]);

  const validatePassword = (): string => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/\d/.test(password)) return 'Password must contain a number';
    if (!/[!@#$%^&*]/.test(password)) return 'Password must contain a special character (!@#$%^&*)';
    if (password !== confirmPassword) return 'Passwords do not match';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await apiClient.patch('/auth/password-reset-confirm', {
        token,
        password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      if (errorMsg.includes('expired')) {
        setError('Reset link has expired. Please request a new password reset.');
      } else if (errorMsg.includes('invalid')) {
        setError('Invalid reset link. Please request a new password reset.');
      } else {
        setError(errorMsg || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            py: 3,
          }}
        >
          <Card sx={{ width: '100%', p: 4, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              ✅ Password Reset Successful!
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Your password has been reset successfully.
            </Alert>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Redirecting you to login... If not redirected, click below.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ mt: 3 }}
            >
              Go to Login
            </Button>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 3,
        }}
      >
        <Card sx={{ width: '100%', p: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Reset Your Password
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Enter a new password to secure your account.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
            />

            {password && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Password Strength:</Typography>
                  <Typography variant="caption" sx={{ color: strength.color, fontWeight: 'bold' }}>
                    {strength.label}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(strength.score / 5) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: strength.color,
                    },
                  }}
                />
              </Box>
            )}

            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                <strong>Password Requirements:</strong>
              </Typography>
              <Typography variant="caption" component="div" sx={{ color: '#666' }}>
                • At least 8 characters
                <br />
                • One uppercase letter (A-Z)
                <br />
                • One lowercase letter (a-z)
                <br />
                • One number (0-9)
                <br />
                • One special character (!@#$%^&*)
              </Typography>
            </Box>

            <TextField
              fullWidth
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading || !password || !confirmPassword}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Reset Password'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Back to Login
            </Button>
          </form>
        </Card>
      </Box>
    </Container>
  );
};
