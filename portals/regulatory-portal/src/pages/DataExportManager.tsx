import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { apiClient } from '../services/api';

export default function DataExportManager() {
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNewExportDialog, setShowNewExportDialog] = useState(false);

  const [exportConfig, setExportConfig] = useState({
    name: '',
    exportType: 'medicines',
    format: 'csv',
    filters: {} as any,
  });

  useEffect(() => {
    loadExports();
    const interval = setInterval(loadExports, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadExports = async () => {
    try {
      const response = await apiClient.get('/api/v2/exports');
      setExports(response.data.data);
    } catch (err: any) {
      console.error('Failed to load exports:', err);
    }
  };

  const handleCreateExport = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/api/v2/exports', exportConfig);
      setSuccess('Export request created successfully');
      setShowNewExportDialog(false);
      setExportConfig({
        name: '',
        exportType: 'medicines',
        format: 'csv',
        filters: {},
      });
      loadExports();
    } catch (err: any) {
      setError(err.message || 'Failed to create export');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (exportId: string, fileName: string) => {
    try {
      const response = await apiClient.get(`/api/v2/exports/${exportId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download export');
    }
  };

  const handleDelete = async (exportId: string) => {
    if (!confirm('Are you sure you want to delete this export?')) return;

    try {
      await apiClient.delete(`/api/v2/exports/${exportId}`);
      setSuccess('Export deleted successfully');
      loadExports();
    } catch (err: any) {
      setError('Failed to delete export');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb > 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Data Export Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Export and download system data in various formats
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadExports}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={() => setShowNewExportDialog(true)}
          >
            New Export
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Total Exports
              </Typography>
              <Typography variant="h4">{exports.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {exports.filter((e) => e.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Processing
              </Typography>
              <Typography variant="h4" color="warning.main">
                {exports.filter((e) => e.status === 'processing').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Failed
              </Typography>
              <Typography variant="h4" color="error.main">
                {exports.filter((e) => e.status === 'failed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Exports Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Records</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No exports found. Create your first export to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                exports.map((exportItem) => (
                  <TableRow key={exportItem.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {exportItem.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exportItem.export_type.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exportItem.format.toUpperCase()}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exportItem.status}
                        color={getStatusColor(exportItem.status) as any}
                        size="small"
                      />
                      {exportItem.status === 'processing' && (
                        <LinearProgress sx={{ mt: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {exportItem.record_count ? exportItem.record_count.toLocaleString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatFileSize(exportItem.file_size)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(exportItem.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {exportItem.expires_at
                          ? new Date(exportItem.expires_at).toLocaleDateString()
                          : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {exportItem.status === 'completed' && (
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                handleDownload(exportItem.id, exportItem.file_name)
                              }
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(exportItem.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* New Export Dialog */}
      <Dialog
        open={showNewExportDialog}
        onClose={() => setShowNewExportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Export</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Export Name"
                  value={exportConfig.name}
                  onChange={(e) =>
                    setExportConfig({ ...exportConfig, name: e.target.value })
                  }
                  placeholder="e.g., Active Medicines Export"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Data Type</InputLabel>
                  <Select
                    value={exportConfig.exportType}
                    label="Data Type"
                    onChange={(e) =>
                      setExportConfig({ ...exportConfig, exportType: e.target.value })
                    }
                  >
                    <MenuItem value="medicines">Medicines</MenuItem>
                    <MenuItem value="audit_logs">Audit Logs</MenuItem>
                    <MenuItem value="recalls">Recalls</MenuItem>
                    <MenuItem value="adverse_events">Adverse Events</MenuItem>
                    <MenuItem value="users">Users</MenuItem>
                    <MenuItem value="tenants">Tenants</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={exportConfig.format}
                    label="Format"
                    onChange={(e) =>
                      setExportConfig({ ...exportConfig, format: e.target.value })
                    }
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="excel">Excel (XLSX)</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="xml">XML</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Filters (Optional)
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={exportConfig.filters.startDate || null}
                    onChange={(date) =>
                      setExportConfig({
                        ...exportConfig,
                        filters: { ...exportConfig.filters, startDate: date },
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={exportConfig.filters.endDate || null}
                    onChange={(date) =>
                      setExportConfig({
                        ...exportConfig,
                        filters: { ...exportConfig.filters, endDate: date },
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>

              {exportConfig.exportType === 'medicines' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status Filter</InputLabel>
                    <Select
                      value={exportConfig.filters.status || ''}
                      label="Status Filter"
                      onChange={(e) =>
                        setExportConfig({
                          ...exportConfig,
                          filters: { ...exportConfig.filters, status: e.target.value },
                        })
                      }
                    >
                      <MenuItem value="">All Status</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                      <MenuItem value="recalled">Recalled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Alert severity="info">
                  The export will be available for download for 7 days after completion.
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewExportDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateExport}
            variant="contained"
            disabled={loading || !exportConfig.name}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Creating...' : 'Create Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}