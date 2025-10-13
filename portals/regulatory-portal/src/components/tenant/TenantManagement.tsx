import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CheckCircle as ApproveIcon,
  Block as SuspendIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  HourglassEmpty as PendingIcon,
  CheckCircleOutline as ActiveIcon,
} from '@mui/icons-material';
import { TenantService } from '../../services/tenant.service';
import TenantFormModal from './TenantFormModal';
import TenantDetailModal from './TenantDetailModal';

interface TenantManagementProps {}

const TenantManagement: React.FC<TenantManagementProps> = () => {
  // State
  const [tenants, setTenants] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTier, setFilterTier] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Confirmation dialogs
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tenant: any | null }>({
    open: false,
    tenant: null,
  });
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; tenant: any | null }>({
    open: false,
    tenant: null,
  });
  const [suspendReason, setSuspendReason] = useState('');

  // Load data
  useEffect(() => {
    loadTenants();
    loadStatistics();
  }, [page, rowsPerPage, searchQuery, filterType, filterStatus, filterTier]);

  const loadTenants = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await TenantService.search({
        query: searchQuery,
        type: filterType || undefined,
        status: filterStatus || undefined,
        subscriptionTier: filterTier || undefined,
        page: page + 1,
        limit: rowsPerPage,
      });

      setTenants(response.tenants);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await TenantService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  // Handlers
  const handleCreateTenant = () => {
    setSelectedTenant(null);
    setShowCreateModal(true);
  };

  const handleEditTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setShowEditModal(true);
  };

  const handleViewTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setShowDetailModal(true);
  };

  const handleDeleteTenant = async () => {
    if (!deleteDialog.tenant) return;

    try {
      await TenantService.delete(deleteDialog.tenant.id);
      setSuccess('Tenant deleted successfully');
      setDeleteDialog({ open: false, tenant: null });
      loadTenants();
      loadStatistics();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tenant');
    }
  };

  const handleApproveTenant = async (tenant: any) => {
    try {
      await TenantService.update(tenant.id, { status: 'active' });
      setSuccess('Tenant approved successfully');
      loadTenants();
      loadStatistics();
    } catch (err: any) {
      setError(err.message || 'Failed to approve tenant');
    }
  };

  const handleSuspendTenant = async () => {
    if (!suspendDialog.tenant || !suspendReason.trim()) {
      setError('Please provide a reason for suspension');
      return;
    }

    try {
      await TenantService.update(suspendDialog.tenant.id, {
        status: 'suspended',
        suspensionReason: suspendReason,
      });
      setSuccess('Tenant suspended successfully');
      setSuspendDialog({ open: false, tenant: null });
      setSuspendReason('');
      loadTenants();
      loadStatistics();
    } catch (err: any) {
      setError(err.message || 'Failed to suspend tenant');
    }
  };

  const handleFormSuccess = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    loadTenants();
    loadStatistics();
    setSuccess('Tenant saved successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending_approval':
        return 'warning';
      case 'suspended':
        return 'error';
      case 'inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'primary';
      case 'professional':
        return 'secondary';
      case 'basic':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Tenant Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage healthcare facilities and organizations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateTenant}
          size="large"
        >
          Add Tenant
        </Button>
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Tenants
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.totalTenants || 0}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {statistics?.activeTenants || 0}
                  </Typography>
                </Box>
                <ActiveIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Pending Approval
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {statistics?.byStatus?.pending_approval || 0}
                  </Typography>
                </Box>
                <PendingIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {statistics?.totalUsers || 0}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="hospital">Hospital</MenuItem>
                  <MenuItem value="clinic">Clinic</MenuItem>
                  <MenuItem value="pharmacy">Pharmacy</MenuItem>
                  <MenuItem value="regulatory_agency">Regulatory Agency</MenuItem>
                  <MenuItem value="eda">EDA</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending_approval">Pending Approval</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth>
                <InputLabel>Subscription Tier</InputLabel>
                <Select
                  value={filterTier}
                  label="Subscription Tier"
                  onChange={(e) => setFilterTier(e.target.value)}
                >
                  <MenuItem value="">All Plans</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Organization</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>License</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No tenants found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {tenant.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tenant.slug}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tenant.type.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tenant.status.replace('_', ' ')}
                        color={getStatusColor(tenant.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tenant.subscriptionTier}
                        color={getTierColor(tenant.subscriptionTier) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {tenant.currentUsers} / {tenant.maxUsers}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tenant.licenseStatus}
                        color={tenant.licenseStatus === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTenant(tenant)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditTenant(tenant)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {tenant.status === 'pending_approval' && (
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApproveTenant(tenant)}
                            >
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {tenant.status === 'active' && (
                          <Tooltip title="Suspend">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setSuspendDialog({ open: true, tenant })}
                            >
                              <SuspendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, tenant })}
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

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Modals */}
      {showCreateModal && (
        <TenantFormModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditModal && selectedTenant && (
        <TenantFormModal
          open={showEditModal}
          tenant={selectedTenant}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetailModal && selectedTenant && (
        <TenantDetailModal
          open={showDetailModal}
          tenant={selectedTenant}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, tenant: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{' '}
            <strong>{deleteDialog.tenant?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, tenant: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteTenant} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={suspendDialog.open}
        onClose={() => {
          setSuspendDialog({ open: false, tenant: null });
          setSuspendReason('');
        }}
      >
        <DialogTitle>Suspend Tenant</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Suspend <strong>{suspendDialog.tenant?.name}</strong>?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for suspension"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSuspendDialog({ open: false, tenant: null });
              setSuspendReason('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSuspendTenant} color="warning" variant="contained">
            Suspend
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantManagement;