// File: frontend/regulatory-portal/src/components/adverseEvent/AdverseEventReporting.tsx
// Purpose: Adverse event reporting dashboard with table and forms

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
import { Add as AddIcon, Report as ReportIcon } from '@mui/icons-material';
import { adverseEventService } from '../../services/adverseEvent.service';
import { AdverseEvent, AdverseEventStatistics } from '../../types/adverseEvent.types';

export const AdverseEventReporting: React.FC = () => {
  const [events, setEvents] = useState<AdverseEvent[]>([]);
  const [statistics, setStatistics] = useState<AdverseEventStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalEvents, setTotalEvents] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  
  // Filters
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
    fetchStatistics();
  }, [page, rowsPerPage, severity, status, searchQuery]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const result = await adverseEventService.search({
        query: searchQuery || undefined,
        severity: severity || undefined,
        status: status || undefined,
        page: page + 1,
        limit: rowsPerPage,
      });
      setEvents(result.events);
      setTotalEvents(result.pagination.total);
    } catch (error) {
      console.error('Failed to fetch adverse events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await adverseEventService.getStatistics('30d');
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
      case 'fatal':
        return 'error';
      case 'life_threatening':
        return 'error';
      case 'severe':
        return 'warning';
      case 'moderate':
        return 'info';
      case 'mild':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'warning';
      case 'under_review':
        return 'info';
      case 'investigated':
        return 'primary';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Adverse Event Reporting
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Report Adverse Event
        </Button>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Reports
                </Typography>
                <Typography variant="h4">{statistics.totalEvents}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Severe/Fatal
                </Typography>
                <Typography variant="h4" color="error">
                  {statistics.bySeverity.severe + statistics.bySeverity.fatal}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Under Review
                </Typography>
                <Typography variant="h4" color="info.main">
                  {statistics.byStatus.under_review}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Closed
                </Typography>
                <Typography variant="h4" color="text.secondary">
                  {statistics.byStatus.closed}
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
              placeholder="Search by report number, description..."
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
                <MenuItem value="fatal">Fatal</MenuItem>
                <MenuItem value="life_threatening">Life Threatening</MenuItem>
                <MenuItem value="severe">Severe</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="mild">Mild</MenuItem>
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
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="under_review">Under Review</MenuItem>
                <MenuItem value="investigated">Investigated</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Adverse Events Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Report Number</TableCell>
              <TableCell>Medicine</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Reporter</TableCell>
              <TableCell>Event Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {event.reportNumber}
                  </Typography>
                </TableCell>
                <TableCell>{event.medicineName || event.medicineId}</TableCell>
                <TableCell>
                  <Chip
                    label={event.severity.replace('_', ' ').toUpperCase()}
                    color={getSeverityColor(event.severity) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {event.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  {event.reporterName}
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    {event.reporterType}
                  </Typography>
                </TableCell>
                <TableCell>{new Date(event.eventDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={event.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(event.status) as any}
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
          count={totalEvents}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Report Adverse Event Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report Adverse Event</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            This form will be implemented with full validation and medicine selection.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" color="primary">
            Submit Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

