// File: frontend/regulatory-portal/src/components/medicine/MedicineDirectory.tsx
// Purpose: Medicine directory with table, search, and CRUD operations

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Typography,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { medicineService } from '../../services/medicine.service';
import type { Medicine, MedicineSearchParams } from '../../types/medicine.types';

export const MedicineDirectory: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [therapeuticClass, setTherapeuticClass] = useState('');

  // Dialogs
  const [openForm, setOpenForm] = useState(false);
  const [openBulkUpload, setOpenBulkUpload] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchMedicines();
  }, [page, rowsPerPage, searchQuery, status, therapeuticClass]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const params: MedicineSearchParams = {
        query: searchQuery || undefined,
        status: status || undefined,
        therapeuticClass: therapeuticClass || undefined,
        page: page + 1,
        limit: rowsPerPage,
      };
      const response = await medicineService.search(params);
      setMedicines(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchMedicines();
  };

  const handleReset = () => {
    setSearchQuery('');
    setStatus('');
    setTherapeuticClass('');
    setPage(0);
  };

  const handleAdd = () => {
    setSelectedMedicine(null);
    setOpenForm(true);
  };

  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setOpenForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setMedicineToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (medicineToDelete) {
      try {
        await medicineService.delete(medicineToDelete);
        fetchMedicines();
        setDeleteConfirmOpen(false);
        setMedicineToDelete(null);
      } catch (error) {
        console.error('Failed to delete medicine:', error);
      }
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'partial_disabled':
        return 'warning';
      case 'permanently_disabled':
        return 'error';
      case 'recalled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Medicine Directory</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setOpenBulkUpload(true)}>
            Bulk Upload
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            Add Medicine
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by name, EDA number, manufacturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="partial_disabled">Partial Disabled</MenuItem>
                <MenuItem value="permanently_disabled">Permanently Disabled</MenuItem>
                <MenuItem value="recalled">Recalled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Therapeutic Class"
              value={therapeuticClass}
              onChange={(e) => setTherapeuticClass(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleSearch} fullWidth>
                Search
              </Button>
              <Button variant="outlined" onClick={handleReset} fullWidth>
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Trade Name</TableCell>
                  <TableCell>Generic Name</TableCell>
                  <TableCell>EDA Number</TableCell>
                  <TableCell>Manufacturer</TableCell>
                  <TableCell>Therapeutic Class</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {medicines.map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {medicine.tradeName}
                      </Typography>
                      {medicine.strength && (
                        <Typography variant="caption" color="text.secondary">
                          {medicine.strength}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{medicine.genericName}</TableCell>
                    <TableCell>{medicine.edaRegistrationNumber}</TableCell>
                    <TableCell>{medicine.manufacturer}</TableCell>
                    <TableCell>{medicine.therapeuticClass}</TableCell>
                    <TableCell>
                      <Chip
                        label={medicine.status?.replace('_', ' ')}
                        color={getStatusColor(medicine.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {medicine.expiryDate && format(new Date(medicine.expiryDate), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEdit(medicine)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(medicine.id!)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this medicine? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

