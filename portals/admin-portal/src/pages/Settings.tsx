/**
 * Settings Page
 * System configuration and preferences
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton
} from '@mui/material';
import {
  Save,
  Refresh,
  Delete,
  Add,
  Email,
  Sms,
  Security,
  Notifications,
  Storage,
  Language
} from '@mui/icons-material';
import { apiService } from '../services/apiService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'HealthFlow',
    siteUrl: 'https://healthflow.eg',
    supportEmail: 'support@healthflow.eg',
    timezone: 'Africa/Cairo',
    language: 'en',
    maintenanceMode: false
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    provider: 'sendgrid',
    sendgridApiKey: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@healthflow.eg',
    fromName: 'HealthFlow'
  });

  // SMS Settings
  const [smsSettings, setSmsSettings] = useState({
    provider: 'twilio',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: '',
    enabled: true
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    twoFactorEnabled: false
  });

  // Storage Settings
  const [storageSettings, setStorageSettings] = useState({
    provider: 's3',
    awsRegion: 'us-east-1',
    awsAccessKey: '',
    awsSecretKey: '',
    awsBucket: '',
    maxFileSize: 10,
    allowedFileTypes: ['pdf', 'jpg', 'png', 'doc', 'docx']
  });

  const handleSaveGeneral = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await apiService.put('/settings/general', generalSettings);
      
      setSuccess('General settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await apiService.put('/settings/email', emailSettings);
      
      setSuccess('Email settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSMS = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await apiService.put('/settings/sms', smsSettings);
      
      setSuccess('SMS settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await apiService.put('/settings/security', securitySettings);
      
      setSuccess('Security settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await apiService.put('/settings/storage', storageSettings);
      
      setSuccess('Storage settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Configure system settings and preferences
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="General" />
            <Tab label="Email" icon={<Email />} iconPosition="start" />
            <Tab label="SMS" icon={<Sms />} iconPosition="start" />
            <Tab label="Security" icon={<Security />} iconPosition="start" />
            <Tab label="Storage" icon={<Storage />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* General Settings */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Site Name"
                  value={generalSettings.siteName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Site URL"
                  value={generalSettings.siteUrl}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteUrl: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Support Email"
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={generalSettings.timezone}
                    label="Timezone"
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                  >
                    <MenuItem value="Africa/Cairo">Africa/Cairo (GMT+2)</MenuItem>
                    <MenuItem value="UTC">UTC</MenuItem>
                    <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={generalSettings.language}
                    label="Language"
                    onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="ar">Arabic</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={generalSettings.maintenanceMode}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMode: e.target.checked })}
                    />
                  }
                  label="Maintenance Mode"
                />
                <Typography variant="caption" display="block" color="textSecondary">
                  Enable to prevent users from accessing the system
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveGeneral}
                  disabled={loading}
                >
                  Save General Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Email Settings */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Email Provider</InputLabel>
                  <Select
                    value={emailSettings.provider}
                    label="Email Provider"
                    onChange={(e) => setEmailSettings({ ...emailSettings, provider: e.target.value })}
                  >
                    <MenuItem value="sendgrid">SendGrid</MenuItem>
                    <MenuItem value="smtp">SMTP</MenuItem>
                    <MenuItem value="mock">Mock (Development)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {emailSettings.provider === 'sendgrid' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="SendGrid API Key"
                    type="password"
                    value={emailSettings.sendgridApiKey}
                    onChange={(e) => setEmailSettings({ ...emailSettings, sendgridApiKey: e.target.value })}
                  />
                </Grid>
              )}

              {emailSettings.provider === 'smtp' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP Host"
                      value={emailSettings.smtpHost}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP Port"
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP User"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP Password"
                      type="password"
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Email"
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Name"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveEmail}
                  disabled={loading}
                >
                  Save Email Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* SMS Settings */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={smsSettings.enabled}
                      onChange={(e) => setSmsSettings({ ...smsSettings, enabled: e.target.checked })}
                    />
                  }
                  label="Enable SMS Notifications"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>SMS Provider</InputLabel>
                  <Select
                    value={smsSettings.provider}
                    label="SMS Provider"
                    onChange={(e) => setSmsSettings({ ...smsSettings, provider: e.target.value })}
                  >
                    <MenuItem value="twilio">Twilio</MenuItem>
                    <MenuItem value="mock">Mock (Development)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {smsSettings.provider === 'twilio' && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Twilio Account SID"
                      value={smsSettings.twilioAccountSid}
                      onChange={(e) => setSmsSettings({ ...smsSettings, twilioAccountSid: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Twilio Auth Token"
                      type="password"
                      value={smsSettings.twilioAuthToken}
                      onChange={(e) => setSmsSettings({ ...smsSettings, twilioAuthToken: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="From Phone Number"
                      value={smsSettings.twilioFromNumber}
                      onChange={(e) => setSmsSettings({ ...smsSettings, twilioFromNumber: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveSMS}
                  disabled={loading}
                >
                  Save SMS Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={tabValue} index={3}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Password Policy
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Password Length"
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.passwordRequireUppercase}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireUppercase: e.target.checked })}
                    />
                  }
                  label="Require Uppercase Letters"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.passwordRequireNumbers}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireNumbers: e.target.checked })}
                    />
                  }
                  label="Require Numbers"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.passwordRequireSpecialChars}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireSpecialChars: e.target.checked })}
                    />
                  }
                  label="Require Special Characters"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Session & Authentication
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Session Timeout (hours)"
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Login Attempts"
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.twoFactorEnabled}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorEnabled: e.target.checked })}
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveSecurity}
                  disabled={loading}
                >
                  Save Security Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Storage Settings */}
        <TabPanel value={tabValue} index={4}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Storage Provider</InputLabel>
                  <Select
                    value={storageSettings.provider}
                    label="Storage Provider"
                    onChange={(e) => setStorageSettings({ ...storageSettings, provider: e.target.value })}
                  >
                    <MenuItem value="s3">AWS S3</MenuItem>
                    <MenuItem value="local">Local Storage</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {storageSettings.provider === 's3' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="AWS Region"
                      value={storageSettings.awsRegion}
                      onChange={(e) => setStorageSettings({ ...storageSettings, awsRegion: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="S3 Bucket Name"
                      value={storageSettings.awsBucket}
                      onChange={(e) => setStorageSettings({ ...storageSettings, awsBucket: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="AWS Access Key"
                      value={storageSettings.awsAccessKey}
                      onChange={(e) => setStorageSettings({ ...storageSettings, awsAccessKey: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="AWS Secret Key"
                      type="password"
                      value={storageSettings.awsSecretKey}
                      onChange={(e) => setStorageSettings({ ...storageSettings, awsSecretKey: e.target.value })}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max File Size (MB)"
                  type="number"
                  value={storageSettings.maxFileSize}
                  onChange={(e) => setStorageSettings({ ...storageSettings, maxFileSize: parseInt(e.target.value) })}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Allowed File Types
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {storageSettings.allowedFileTypes.map((type) => (
                    <Chip key={type} label={type} onDelete={() => {
                      setStorageSettings({
                        ...storageSettings,
                        allowedFileTypes: storageSettings.allowedFileTypes.filter(t => t !== type)
                      });
                    }} />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveStorage}
                  disabled={loading}
                >
                  Save Storage Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default Settings;

