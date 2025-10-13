import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  Typography,
  Chip,
} from '@mui/material';
import { UserService } from '../../services/user.service';

interface EditUserRoleModalProps {
  open: boolean;
  user: any;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserRoleModal: React.FC<EditUserRoleModalProps> = ({
  open,
  user,
  tenantId,
  onClose,
  onSuccess,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setSelectedRoleId(user.role_id);
      loadRoles();
    }
  }, [open, user]);

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await fetch(`/api/v2/tenants/${tenantId}/roles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setRoles(data.data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
      // Set default roles
      setRoles([
        { id: 'tenant_admin', name: 'Tenant Admin' },
        { id: 'doctor', name: 'Doctor' },
        { id: 'pharmacist', name: 'Pharmacist' },
        { id: 'nurse', name: 'Nurse' },
        { id: 'viewer', name: 'Viewer' },
      ]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedRoleId) {
      setError('Please select a role');
      setLoading(false);
      return;
    }

    if (selectedRoleId === user.role_id) {
      setError('Please select a different role');
      setLoading(false);
      return;
    }

    try {
      await UserService.updateUserRole(tenantId, user.id, selectedRoleId);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Update User Role</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            {/* User Info */}
            <Box
              sx={{
                p: 2,
                mb: 3,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                User
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip label={`Current: ${user?.role_name}`} size="small" color="primary" />
              </Box>
            </Box>

            {/* Role Selection */}
            <FormControl fullWidth required>
              <InputLabel>New Role</InputLabel>
              <Select
                value={selectedRoleId}
                label="New Role"
                onChange={(e) => setSelectedRoleId(e.target.value)}
                disabled={loadingRoles}
              >
                {loadingRoles ? (
                  <MenuItem value="">Loading roles...</MenuItem>
                ) : (
                  roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                      {role.id === user?.role_id && ' (Current)'}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: 'warning.lighter',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'warning.light',
              }}
            >
              <Typography variant="body2" color="warning.dark">
                <strong>Warning:</strong> Changing the user's role will immediately update their
                permissions. They may need to log out and log back in for changes to take full
                effect.
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || loadingRoles || selectedRoleId === user?.role_id}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditUserRoleModal;