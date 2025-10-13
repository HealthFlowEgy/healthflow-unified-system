// File: frontend/regulatory-portal/src/components/recall/RecallManagement.tsx
// Purpose: Recall management dashboard with table and forms

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Warning as WarningIcon } from '@mui/icons-material';
import { recallService } from '../../services/recall.service';
import { Recall, RecallFormData, RecallStatistics } from '../../types/recall.types';

export const RecallManagement: React.FC = () => {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [statistics, setStatistics] = useState<RecallStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRecalls, setTotalRecalls] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  
  // Filters
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecalls();
    fetchStatistics();
  }, [page, rowsPerPage, severity, status, searchQuery]);

  const fetchRecalls = async () => {
    setLoading(true);
    try {
      const result = await recallService.search({
        query: searchQuery || undefined,
        severity: severity || undefined,
        status: status || undefined,
        page: page + 1,
        limit: rowsPerPage,
      });
      setRecalls(result.recalls);
      setTotalRecalls(result.pagination.total);
    } catch (error) {
      console.error('Failed to fetch recalls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await recallService.getStatistics('30d');
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'class_1':
        return 'error';
      case 'class_2':
        return 'warning';
      case 'class_3':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initiated':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Medicine Recall Management
        </Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Initiate Recall
        </Button>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Recalls
                </Typography>
                <Typography variant="h4">{statistics.totalRecalls}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Recalls
                </Typography>
                <Typography variant="h4" color="error">
                  {statistics.activeRecalls}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Class I (Urgent)
                </Typography>
                <Typography variant="h4" color="error">
                  {statistics.bySeverity.class1}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h4" color="success.main">
                  {statistics.completedRecalls}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recall number, reason..."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severity}
                label="Severity"
                onChange={(e) => setSeverity(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="class_1">Class I - Urgent</MenuItem>
                <MenuItem value="class_2">Class II - Moderate</MenuItem>
                <MenuItem value="class_3">Class III - Low Risk</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="initiated">Initiated</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Recalls Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Recall Number</TableCell>
              <TableCell>Medicine</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Batch Numbers</TableCell>
              <TableCell>Recall Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recalls.map((recall) => (
              <TableRow key={recall.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {recall.recallNumber}
                  </Typography>
                </TableCell>
                <TableCell>{recall.medicineName || recall.medicineId}</TableCell>
                <TableCell>
                  <Chip
                    label={recall.severity.replace('_', ' ').toUpperCase()}
                    color={getSeverityColor(recall.severity) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{recall.reason}</TableCell>
                <TableCell>{recall.batchNumbers.join(', ')}</TableCell>
                <TableCell>{new Date(recall.recallDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={recall.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(recall.status) as any}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalRecalls}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Initiate Recall Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Initiate Medicine Recall</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            This form will be implemented with full validation and medicine selection.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error">
            Initiate Recall
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

