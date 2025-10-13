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
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  Mail as InviteIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as SuspendIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  HourglassEmpty as PendingIcon,
  CheckCircleOutline as ActiveIcon,
} from '@mui/icons-material';
import { UserService } from '../../services/user.service';
import { TenantService } from '../../services/tenant.service';
import InviteUserModal from './InviteUserModal';
import EditUserRoleModal from './EditUserRoleModal';

interface UserManagementProps {}

const UserManagement: React.FC<UserManagementProps> = () => {
  // State
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Confirmation dialogs
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    user: any | null;
    tenantId: string | null;
  }>({
    open: false,
    user: null,
    tenantId: null,
  });
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    user: any | null;
    tenantId: string | null;
  }>({
    open: false,
    user: null,
    tenantId: null,
  });
  const [suspendReason, setSuspendReason] = useState('');

  // Statistics
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingInvites: 0,
    suspendedUsers: 0,
  });

  // Load data
  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, searchQuery, filterTenant, filterStatus, filterRole]);

  const loadTenants = async () => {
    try {
      const response = await TenantService.search({ limit: 1000 });
      setTenants(response.tenants);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      if (filterTenant) {
        // Get users for specific tenant
        const response = await UserService.getTenantUsers(filterTenant);
        setUsers(response.users);
        setTotalCount(response.users.length);

        // Calculate statistics
        setStatistics({
          totalUsers: response.users.length,
          activeUsers: response.users.filter((u: any) => u.tenant_status === 'active').length,
          pendingInvites: response.users.filter((u: any) => u.tenant_status === 'invited').length,
          suspendedUsers: response.users.filter((u: any) => u.tenant_status === 'suspended')
            .length,
        });
      } else {
        // Get all users (would need to implement this endpoint)
        // For now, show message to select tenant
        setUsers([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleInviteUser = () => {
    setShowInviteModal(true);
  };

  const handleEditUserRole = (user: any) => {
    setSelectedUser(user);
    setShowEditRoleModal(true);
  };

  const handleRemoveUser = async () => {
    if (!removeDialog.user || !removeDialog.tenantId) return;

    try {
      await UserService.removeUserFromTenant(removeDialog.tenantId, removeDialog.user.id);
      setSuccess('User removed from tenant successfully');
      setRemoveDialog({ open: false, user: null, tenantId: null });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to remove user');
    }
  };

  const handleSuspendUser = async () => {
    if (!suspendDialog.user || !suspendDialog.tenantId || !suspendReason.trim()) {
      setError('Please provide a reason for suspension');
      return;
    }

    try {
      await UserService.updateUserRole(
        suspendDialog.tenantId,
        suspendDialog.user.id,
        suspendDialog.user.role_id,
        { status: 'suspended', reason: suspendReason }
      );
      setSuccess('User suspended successfully');
      setSuspendDialog({ open: false, user: null, tenantId: null });
      setSuspendReason('');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to suspend user');
    }
  };

  const handleModalSuccess = () => {
    setShowInviteModal(false);
    setShowEditRoleModal(false);
    loadUsers();
    setSuccess('Operation completed successfully');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users across all tenants
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<InviteIcon />}
          onClick={handleInviteUser}
          size="large"
          disabled={!filterTenant}
        >
          Invite User
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
                    Total Users
                  </Typography>
                  <Typography variant="h4">{statistics.totalUsers}</Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
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
                    {statistics.activeUsers}
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
                    Pending Invites
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {statistics.pendingInvites}
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
                    Suspended
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {statistics.suspendedUsers}
                  </Typography>
                </Box>
                <SuspendIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
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
                placeholder="Search by name or email..."
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

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tenant *</InputLabel>
                <Select
                  value={filterTenant}
                  label="Tenant *"
                  onChange={(e) => setFilterTenant(e.target.value)}
                >
                  <MenuItem value="">All Tenants</MenuItem>
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="invited">Invited</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={filterRole}
                  label="Role"
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="tenant_admin">Tenant Admin</MenuItem>
                  <MenuItem value="doctor">Doctor</MenuItem>
                  <MenuItem value="pharmacist">Pharmacist</MenuItem>
                  <MenuItem value="nurse">Nurse</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {!filterTenant && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Please select a tenant to view users
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {filterTenant ? 'No users found' : 'Select a tenant to view users'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.phone || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role_name} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.tenant_status}
                        color={
                          user.tenant_status === 'active'
                            ? 'success'
                            : user.tenant_status === 'invited'
                            ? 'warning'
                            : user.tenant_status === 'suspended'
                            ? 'error'
                            : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.last_active_at
                          ? new Date(user.last_active_at).toLocaleDateString()
                          : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit Role">
                          <IconButton size="small" onClick={() => handleEditUserRole(user)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {user.tenant_status === 'active' && (
                          <Tooltip title="Suspend">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() =>
                                setSuspendDialog({
                                  open: true,
                                  user,
                                  tenantId: filterTenant,
                                })
                              }
                            >
                              <SuspendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Remove from Tenant">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setRemoveDialog({
                                open: true,
                                user,
                                tenantId: filterTenant,
                              })
                            }
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
      {showInviteModal && (
        <InviteUserModal
          open={showInviteModal}
          tenantId={filterTenant}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showEditRoleModal && selectedUser && (
        <EditUserRoleModal
          open={showEditRoleModal}
          user={selectedUser}
          tenantId={filterTenant}
          onClose={() => {
            setShowEditRoleModal(false);
            setSelectedUser(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={removeDialog.open}
        onClose={() => setRemoveDialog({ open: false, user: null, tenantId: null })}
      >
        <DialogTitle>Confirm Remove</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{removeDialog.user?.name}</strong> from this
            tenant? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialog({ open: false, user: null, tenantId: null })}>
            Cancel
          </Button>
          <Button onClick={handleRemoveUser} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={suspendDialog.open}
        onClose={() => {
          setSuspendDialog({ open: false, user: null, tenantId: null });
          setSuspendReason('');
        }}
      >
        <DialogTitle>Suspend User</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Suspend <strong>{suspendDialog.user?.name}</strong>?
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
              setSuspendDialog({ open: false, user: null, tenantId: null });
              setSuspendReason('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSuspendUser} color="warning" variant="contained">
            Suspend
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;