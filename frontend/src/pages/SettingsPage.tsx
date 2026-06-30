import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Checkbox,
  FormControlLabel,
  Stack,
  Divider,
} from '@mui/material';
import Layout from '@components/Layout';
import { apiClient } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    isConfigured: false,
    enableNotifications: true,
  });

  const [notificationRules, setNotificationRules] = useState({
    leads: true,
    opportunities: true,
    tickets: true,
    contracts: true,
    account: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/email-settings');
      if (response.data.success) {
        setEmailSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: string, value: any) => {
    setEmailSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setSuccessMessage('');
      setErrorMessage('');

      const response = await apiClient.patch('/email-settings', emailSettings);
      if (response.data.success) {
        setEmailSettings(response.data.data);
        setSuccessMessage('Email settings saved successfully!');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to save email settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setSuccessMessage('');
      setErrorMessage('');

      const response = await apiClient.post('/email-settings/test-connection', {});
      if (response.data.success) {
        setSuccessMessage('✅ Email connection successful!');
      }
    } catch (error: any) {
      setErrorMessage('❌ Email connection failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setSendingTest(true);
      setSuccessMessage('');
      setErrorMessage('');

      const response = await apiClient.post('/email-settings/send-test-email', {});
      if (response.data.success) {
        setSuccessMessage(`✅ Test email sent to ${response.data.data.sentTo}`);
      }
    } catch (error: any) {
      setErrorMessage('❌ Failed to send test email: ' + (error.response?.data?.error || error.message));
    } finally {
      setSendingTest(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          ⚙️ Settings
        </Typography>

        <Card>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Email Configuration" />
            <Tab label="Notification Rules" />
            <Tab label="Email Templates" />
          </Tabs>

          {/* Email Configuration Tab */}
          <TabPanel value={tabValue} index={0}>
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
            {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

            <Box sx={{ maxWidth: 600 }}>
              <TextField
                fullWidth
                label="SMTP Host"
                value={emailSettings.smtpHost}
                onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
                placeholder="e.g., smtp.gmail.com"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                type="number"
                label="SMTP Port"
                value={emailSettings.smtpPort}
                onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="SMTP Username"
                value={emailSettings.smtpUser}
                onChange={(e) => handleSettingChange('smtpUser', e.target.value)}
                placeholder="your-email@gmail.com"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                type="password"
                label="SMTP Password"
                value={emailSettings.smtpPassword}
                onChange={(e) => handleSettingChange('smtpPassword', e.target.value)}
                placeholder="Enter your app password"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="From Email"
                value={emailSettings.fromEmail}
                onChange={(e) => handleSettingChange('fromEmail', e.target.value)}
                placeholder="noreply@crm.local"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="From Name"
                value={emailSettings.fromName}
                onChange={(e) => handleSettingChange('fromName', e.target.value)}
                placeholder="CRM System"
                sx={{ mb: 3 }}
              />

              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={handleSaveSettings} disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'Save Settings'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleTestConnection}
                  disabled={testing || !emailSettings.smtpHost}
                >
                  {testing ? <CircularProgress size={24} /> : 'Test Connection'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !emailSettings.isConfigured}
                >
                  {sendingTest ? <CircularProgress size={24} /> : 'Send Test Email'}
                </Button>
              </Stack>

              <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Setup Guide:</strong>
                </Typography>
                <ul style={{ margin: '10px 0' }}>
                  <li>
                    <strong>Gmail:</strong> Enable "2-Step Verification" and generate an "App Password"
                  </li>
                  <li>
                    <strong>Office 365:</strong> Use your email and password (port 587 with TLS)
                  </li>
                  <li>
                    <strong>Custom SMTP:</strong> Contact your email provider for server details
                  </li>
                </ul>
              </Box>
            </Box>
          </TabPanel>

          {/* Notification Rules Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ maxWidth: 400 }}>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                Select which events should trigger email notifications to users:
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={notificationRules.leads}
                    onChange={(e) => setNotificationRules((prev) => ({ ...prev, leads: e.target.checked }))}
                  />
                }
                label="Lead Assignments & Updates"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notificationRules.opportunities}
                    onChange={(e) => setNotificationRules((prev) => ({ ...prev, opportunities: e.target.checked }))}
                  />
                }
                label="Opportunity Stage Changes"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notificationRules.tickets}
                    onChange={(e) => setNotificationRules((prev) => ({ ...prev, tickets: e.target.checked }))}
                  />
                }
                label="Ticket Assignments & Updates"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notificationRules.contracts}
                    onChange={(e) => setNotificationRules((prev) => ({ ...prev, contracts: e.target.checked }))}
                  />
                }
                label="Contract Approvals"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notificationRules.account}
                    onChange={(e) => setNotificationRules((prev) => ({ ...prev, account: e.target.checked }))}
                  />
                }
                label="User Account Actions"
              />
            </Box>
          </TabPanel>

          {/* Email Templates Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Email templates are used to customize notification messages. Contact support to customize templates.
            </Typography>

            <Stack spacing={2}>
              {[
                { name: 'Password Reset', description: 'Sent when user requests password reset' },
                { name: 'Temporary Password', description: 'Sent when admin creates user account' },
                { name: 'Lead Assignment', description: 'Sent when lead is assigned to user' },
                { name: 'Opportunity Update', description: 'Sent when opportunity stage changes' },
                { name: 'Ticket Assignment', description: 'Sent when ticket is assigned to user' },
                { name: 'Contract Approval', description: 'Sent when contract awaits approval' },
              ].map((template) => (
                <Box key={template.name} sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                  <Typography variant="subtitle2">{template.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    {template.description}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </TabPanel>
        </Card>
      </Box>
    </Layout>
  );
};
