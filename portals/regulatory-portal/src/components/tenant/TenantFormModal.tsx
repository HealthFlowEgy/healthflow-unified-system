import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { TenantService } from '../../services/tenant.service';

interface TenantFormModalProps {
  open: boolean;
  tenant?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const TenantFormModal: React.FC<TenantFormModalProps> = ({
  open,
  tenant,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'hospital',
    licenseNumber: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    governorate: '',
    postalCode: '',
    country: 'Egypt',
    subscriptionTier: 'basic',
    maxUsers: 10,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        type: tenant.type || 'hospital',
        licenseNumber: tenant.licenseNumber || '',
        primaryContactName: tenant.primaryContactName || '',
        primaryContactEmail: tenant.primaryContactEmail || '',
        primaryContactPhone: tenant.primaryContactPhone || '',
        addressLine1: tenant.addressLine1 || '',
        addressLine2: tenant.addressLine2 || '',
        city: tenant.city || '',
        governorate: tenant.governorate || '',
        postalCode: tenant.postalCode || '',
        country: tenant.country || 'Egypt',
        subscriptionTier: tenant.subscriptionTier || 'basic',
        maxUsers: tenant.maxUsers || 10,
      });
    }
  }, [tenant]);

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tenant) {
        await TenantService.update(tenant.id, formData);
      } else {
        await TenantService.create(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{tenant ? 'Edit Tenant' : 'Create Tenant'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Organization Name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Type"
                    onChange={(e) => handleChange('type', e.target.value)}
                  >
                    <MenuItem value="hospital">Hospital</MenuItem>
                    <MenuItem value="clinic">Clinic</MenuItem>
                    <MenuItem value="pharmacy">Pharmacy</MenuItem>
                    <MenuItem value="regulatory_agency">Regulatory Agency</MenuItem>
                    <MenuItem value="eda">EDA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required={['hospital', 'clinic', 'pharmacy'].includes(formData.type)}
                  label="License Number"
                  value={formData.licenseNumber}
                  onChange={(e) => handleChange('licenseNumber', e.target.value)}
                />
              </Grid>

              {/* Contact Information */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contact Person Name"
                  value={formData.primaryContactName}
                  onChange={(e) => handleChange('primaryContactName', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="email"
                  label="Contact Email"
                  value={formData.primaryContactEmail}
                  onChange={(e) => handleChange('primaryContactEmail', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={formData.primaryContactPhone}
                  onChange={(e) => handleChange('primaryContactPhone', e.target.value)}
                  placeholder="+20 XXX XXX XXXX"
                />
              </Grid>

              {/* Address Information */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  value={formData.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 2"
                  value={formData.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Governorate"
                  value={formData.governorate}
                  onChange={(e) => handleChange('governorate', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
              </Grid>

              {/* Subscription Information */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Subscription Tier</InputLabel>
                  <Select
                    value={formData.subscriptionTier}
                    label="Subscription Tier"
                    onChange={(e) => handleChange('subscriptionTier', e.target.value)}
                  >
                    <MenuItem value="basic">Basic</MenuItem>
                    <MenuItem value="professional">Professional</MenuItem>
                    <MenuItem value="enterprise">Enterprise</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Users"
                  value={formData.maxUsers}
                  onChange={(e) => handleChange('maxUsers', parseInt(e.target.value))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {tenant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TenantFormModal;