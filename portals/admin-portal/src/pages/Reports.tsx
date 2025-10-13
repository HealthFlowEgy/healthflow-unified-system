/**
 * Reports Page
 * Generate and export system reports
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  PlayArrow,
  Download,
  Schedule,
  PictureAsPdf,
  TableChart,
  Description
} from '@mui/icons-material';
import { apiService } from '../services/apiService';

interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  parameters?: any;
}

interface ReportExecution {
  id: string;
  reportId: string;
  reportName: string;
  executedAt: string;
  status: 'success' | 'failed' | 'running';
  rowCount?: number;
  error?: string;
}

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parameters, setParameters] = useState<any>({
    startDate: null,
    endDate: null,
    format: 'pdf'
  });

  useEffect(() => {
    loadReports();
    loadExecutions();
  }, []);

  const loadReports = async () => {
    try {
      // Mock reports - would come from API
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Prescription Summary',
          description: 'Summary of all prescriptions with status breakdown',
          type: 'prescription_summary',
          category: 'Clinical'
        },
        {
          id: '2',
          name: 'User Activity Report',
          description: 'Detailed user activity and engagement metrics',
          type: 'user_activity',
          category: 'System'
        },
        {
          id: '3',
          name: 'Appointment Analytics',
          description: 'Appointment statistics and trends',
          type: 'appointment_analytics',
          category: 'Clinical'
        },
        {
          id: '4',
          name: 'Financial Summary',
          description: 'Revenue and financial metrics',
          type: 'financial_summary',
          category: 'Financial'
        },
        {
          id: '5',
          name: 'Doctor Performance',
          description: 'Doctor productivity and performance metrics',
          type: 'doctor_performance',
          category: 'Clinical'
        },
        {
          id: '6',
          name: 'Patient Demographics',
          description: 'Patient population demographics and statistics',
          type: 'patient_demographics',
          category: 'Clinical'
        }
      ];

      setReports(mockReports);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    }
  };

  const loadExecutions = async () => {
    try {
      // Mock executions - would come from API
      const mockExecutions: ReportExecution[] = [
        {
          id: '1',
          reportId: '1',
          reportName: 'Prescription Summary',
          executedAt: new Date().toISOString(),
          status: 'success',
          rowCount: 1234
        },
        {
          id: '2',
          reportId: '2',
          reportName: 'User Activity Report',
          executedAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'success',
          rowCount: 567
        }
      ];

      setExecutions(mockExecutions);
    } catch (err: any) {
      console.error('Failed to load executions:', err);
    }
  };

  const handleRunReport = (report: Report) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleExecuteReport = async () => {
    if (!selectedReport) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.post(`/bi-dashboard/reports/${selectedReport.id}/execute`, {
        parameters: {
          ...parameters,
          startDate: parameters.startDate?.toISOString(),
          endDate: parameters.endDate?.toISOString()
        }
      });

      // Download the report
      const blob = new Blob([response.data], { 
        type: parameters.format === 'pdf' ? 'application/pdf' : 
              parameters.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'text/csv'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedReport.name}-${new Date().toISOString()}.${parameters.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setDialogOpen(false);
      loadExecutions();
    } catch (err: any) {
      setError(err.message || 'Failed to execute report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCategoryColor = (category: string): 'primary' | 'secondary' | 'info' | 'success' => {
    switch (category) {
      case 'Clinical':
        return 'primary';
      case 'Financial':
        return 'success';
      case 'System':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Generate and export system reports
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Available Reports */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Available Reports
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {reports.map((report) => (
          <Grid item xs={12} sm={6} md={4} key={report.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" component="div">
                    {report.name}
                  </Typography>
                  <Chip
                    label={report.category}
                    color={getCategoryColor(report.category)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {report.description}
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => handleRunReport(report)}
                    fullWidth
                  >
                    Run Report
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Executions */}
      <Typography variant="h6" gutterBottom>
        Recent Executions
      </Typography>
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report Name</TableCell>
                  <TableCell>Executed At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Row Count</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {executions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary">
                        No executions yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  executions.map((execution) => (
                    <TableRow key={execution.id} hover>
                      <TableCell>{execution.reportName}</TableCell>
                      <TableCell>
                        {new Date(execution.executedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={execution.status}
                          color={getStatusColor(execution.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {execution.rowCount?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        {execution.status === 'success' && (
                          <Button
                            size="small"
                            startIcon={<Download />}
                          >
                            Download
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Run Report Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Run Report: {selectedReport?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <DatePicker
                    label="Start Date"
                    value={parameters.startDate}
                    onChange={(date) => setParameters({ ...parameters, startDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <DatePicker
                    label="End Date"
                    value={parameters.endDate}
                    onChange={(date) => setParameters({ ...parameters, endDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Export Format</InputLabel>
                    <Select
                      value={parameters.format}
                      label="Export Format"
                      onChange={(e) => setParameters({ ...parameters, format: e.target.value })}
                    >
                      <MenuItem value="pdf">
                        <Box display="flex" alignItems="center" gap={1}>
                          <PictureAsPdf fontSize="small" />
                          PDF
                        </Box>
                      </MenuItem>
                      <MenuItem value="excel">
                        <Box display="flex" alignItems="center" gap={1}>
                          <TableChart fontSize="small" />
                          Excel
                        </Box>
                      </MenuItem>
                      <MenuItem value="csv">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Description fontSize="small" />
                          CSV
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExecuteReport}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;

