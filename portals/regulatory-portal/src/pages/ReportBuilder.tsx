import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { apiClient } from '../services/api';

const steps = ['Report Details', 'Select Data', 'Configure Filters', 'Schedule & Export'];

const reportTypes = [
  { value: 'audit_summary', label: 'Audit Summary' },
  { value: 'medicine_catalog', label: 'Medicine Catalog' },
  { value: 'recall_summary', label: 'Recall Summary' },
  { value: 'adverse_event_summary', label: 'Adverse Event Summary' },
  { value: 'user_activity', label: 'User Activity' },
  { value: 'tenant_overview', label: 'Tenant Overview' },
  { value: 'compliance', label: 'Compliance Report' },
];

export default function ReportBuilder() {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [reportConfig, setReportConfig] = useState({
    name: '',
    description: '',
    type: '',
    format: 'pdf',
    filters: {} as any,
    schedule: {
      enabled: false,
      frequency: 'weekly',
      recipients: [] as string[],
    },
  });

  const [recipientEmail, setRecipientEmail] = useState('');

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const updateConfig = (field: string, value: any) => {
    setReportConfig({ ...reportConfig, [field]: value });
  };

  const updateFilter = (key: string, value: any) => {
    setReportConfig({
      ...reportConfig,
      filters: { ...reportConfig.filters, [key]: value },
    });
  };

  const addRecipient = () => {
    if (recipientEmail && !reportConfig.schedule.recipients.includes(recipientEmail)) {
      setReportConfig({
        ...reportConfig,
        schedule: {
          ...reportConfig.schedule,
          recipients: [...reportConfig.schedule.recipients, recipientEmail],
        },
      });
      setRecipientEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    setReportConfig({
      ...reportConfig,
      schedule: {
        ...reportConfig.schedule,
        recipients: reportConfig.schedule.recipients.filter((e) => e !== email),
      },
    });
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post('/api/v2/reports', {
        name: reportConfig.name,
        type: reportConfig.type,
        query: {}, // Will be built based on type
        format: reportConfig.format,
        filters: reportConfig.filters,
      });

      const reportId = response.data.data.id;

      // Execute report
      const executionResponse = await apiClient.post(`/api/v2/reports/${reportId}/execute`, {
        parameters: reportConfig.filters,
      });

      setSuccess(
        `Report generation started. Execution ID: ${executionResponse.data.data.id}`
      );

      // If scheduling is enabled
      if (reportConfig.schedule.enabled) {
        await apiClient.post(`/api/v2/reports/${reportId}/schedule`, {
          cronExpression: getCronExpression(reportConfig.schedule.frequency),
          recipients: reportConfig.schedule.recipients,
        });
        setSuccess((prev) => prev + ' Report has been scheduled successfully.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getCronExpression = (frequency: string): string => {
    switch (frequency) {
      case 'daily':
        return '0 9 * * *'; // 9 AM daily
      case 'weekly':
        return '0 9 * * 1'; // 9 AM every Monday
      case 'monthly':
        return '0 9 1 * *'; // 9 AM first day of month
      default:
        return '0 9 * * *';
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Report Name"
                value={reportConfig.name}
                onChange={(e) => updateConfig('name', e.target.value)}
                placeholder="e.g., Monthly Audit Summary"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={reportConfig.description}
                onChange={(e) => updateConfig('description', e.target.value)}
                placeholder="Describe the purpose of this report..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportConfig.type}
                  label="Report Type"
                  onChange={(e) => updateConfig('type', e.target.value)}
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={reportConfig.format}
                  label="Export Format"
                  onChange={(e) => updateConfig('format', e.target.value)}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              The following data will be included in your report:
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              Data selection is automatically configured based on the report type you selected:{' '}
              <strong>{reportTypes.find((t) => t.value === reportConfig.type)?.label}</strong>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={reportConfig.filters.startDate || null}
                  onChange={(date) => updateFilter('startDate', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={reportConfig.filters.endDate || null}
                  onChange={(date) => updateFilter('endDate', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              {/* Additional filters based on report type */}
              {reportConfig.type === 'recall_summary' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={reportConfig.filters.severity || ''}
                      label="Severity"
                      onChange={(e) => updateFilter('severity', e.target.value)}
                    >
                      <MenuItem value="">All Severities</MenuItem>
                      <MenuItem value="class_1">Class I</MenuItem>
                      <MenuItem value="class_2">Class II</MenuItem>
                      <MenuItem value="class_3">Class III</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {reportConfig.type === 'medicine_catalog' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={reportConfig.filters.status || ''}
                      label="Status"
                      onChange={(e) => updateFilter('status', e.target.value)}
                    >
                      <MenuItem value="">All Status</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                      <MenuItem value="recalled">Recalled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </LocalizationProvider>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Schedule Report
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Schedule Frequency</InputLabel>
                  <Select
                    value={reportConfig.schedule.enabled ? reportConfig.schedule.frequency : 'none'}
                    label="Schedule Frequency"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'none') {
                        setReportConfig({
                          ...reportConfig,
                          schedule: { ...reportConfig.schedule, enabled: false },
                        });
                      } else {
                        setReportConfig({
                          ...reportConfig,
                          schedule: { ...reportConfig.schedule, enabled: true, frequency: value },
                        });
                      }
                    }}
                  >
                    <MenuItem value="none">One-time Report</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {reportConfig.schedule.enabled && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Email Recipients
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Email Address"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addRecipient();
                        }
                      }}
                    />
                    <Button variant="contained" onClick={addRecipient}>
                      <AddIcon />
                    </Button>
                  </Box>

                  <List>
                    {reportConfig.schedule.recipients.map((email, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={email} />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => removeRecipient(email)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>

                  {reportConfig.schedule.recipients.length === 0 && (
                    <Alert severity="warning">
                      Add at least one recipient to receive scheduled reports
                    </Alert>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Report Builder
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create custom reports and schedule automated delivery
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: 300 }}>{renderStepContent(activeStep)}</Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Back
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleGenerateReport}
                  disabled={loading || !reportConfig.name || !reportConfig.type}
                  startIcon={loading ? <CircularProgress size={20} /> : <RunIcon />}
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={
                    (activeStep === 0 && (!reportConfig.name || !reportConfig.type))
                  }
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}