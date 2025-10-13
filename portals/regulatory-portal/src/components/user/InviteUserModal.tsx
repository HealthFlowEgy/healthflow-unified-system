import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import { UserService } from '../../services/user.service';

interface InviteUserModalProps {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({
  open,
  tenantId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    roleId: '',
  });

  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && tenantId) {
      loadRoles();
    }
  }, [open, tenantId]);

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      // Get available roles for tenant
      // Note: You may need to implement this endpoint
      const response = await fetch(`/api/v2/tenants/${tenantId}/roles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setRoles(data.data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
      // Set default roles if API fails
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

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.email || !formData.roleId) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await UserService.createInvitation(tenantId, formData.email, formData.roleId);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              type="email"
              label="Email Address"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="user@example.com"
              helperText="The user will receive an invitation email"
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.roleId}
                label="Role"
                onChange={(e) => handleChange('roleId', e.target.value)}
                disabled={loadingRoles}
              >
                {loadingRoles ? (
                  <MenuItem value="">Loading roles...</MenuItem>
                ) : (
                  roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: 'info.lighter',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'info.light',
              }}
            >
              <Typography variant="body2" color="info.dark">
                <strong>Note:</strong> The user will receive an email invitation with instructions
                to set up their account. The invitation will expire in 7 days.
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
            disabled={loading || loadingRoles}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InviteUserModal;