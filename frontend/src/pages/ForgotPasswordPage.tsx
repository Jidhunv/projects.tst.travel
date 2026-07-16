import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Container,
} from '@mui/material';
import { apiClient } from '../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/auth/password-reset', { email });
      setSubmitted(true);
    } catch (error: any) {
      setError(
        error.response?.data?.error ||
        error.message ||
        'Failed to send password reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                ✅ Check Your Email
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                Password reset link sent to <strong>{email}</strong>
              </Alert>
              <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                We've sent a password reset link to your email. The link is valid for 24 hours.
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                Click the link in the email to reset your password.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setSubmitted(false)}
              >
                Try Another Email
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: '#666' }}>
                <strong>Didn't receive an email?</strong>
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#666', mt: 1 }}>
                • Check your spam folder
                <br />
                • Make sure you entered the correct email address
                <br />• Contact your administrator for assistance
              </Typography>
            </Box>
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
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
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
