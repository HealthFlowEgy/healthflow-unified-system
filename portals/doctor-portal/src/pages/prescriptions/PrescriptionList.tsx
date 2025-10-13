/**
 * Prescription List Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem
} from '@mui/material';
import { Add, Search, Visibility, GetApp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';

export default function PrescriptionList() {
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPrescriptions, setTotalPrescriptions] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPrescriptions();
  }, [page, rowsPerPage, statusFilter, searchQuery]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchQuery) {
        params.query = searchQuery;
      }

      const response = await apiService.getPrescriptions(params);
      setPrescriptions(response.data);
      setTotalPrescriptions(response.pagination.total);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: any = {
      draft: 'default',
      validated: 'info',
      approved: 'success',
      dispensed: 'success',
      cancelled: 'error',
      rejected: 'error'
    };
    return statusColors[status] || 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Prescriptions
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/prescriptions/new')}
        >
          New Prescription
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            sx={{ flex: 1 }}
            placeholder="Search by patient name or prescription number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
          <TextField
            select
            sx={{ minWidth: 200 }}
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="validated">Validated</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="dispensed">Dispensed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
        </Box>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Prescription #</strong></TableCell>
                <TableCell><strong>Patient</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Medications</strong></TableCell>
                <TableCell><strong>AI Score</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prescriptions.map((prescription) => (
                <TableRow key={prescription.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {prescription.prescriptionNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{prescription.patientName}</TableCell>
                  <TableCell>
                    {new Date(prescription.prescriptionDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={prescription.status}
                      color={getStatusColor(prescription.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{prescription.items?.length || 0} items</TableCell>
                  <TableCell>
                    {prescription.aiValidationScore ? (
                      <Chip
                        label={`${(parseFloat(prescription.aiValidationScore) * 100).toFixed(0)}%`}
                        size="small"
                        color={parseFloat(prescription.aiValidationScore) > 0.8 ? 'success' : 'warning'}
                      />
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/prescriptions/${prescription.id}`)}
                      title="View"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Download"
                    >
                      <GetApp />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalPrescriptions}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>
    </Box>
  );
}