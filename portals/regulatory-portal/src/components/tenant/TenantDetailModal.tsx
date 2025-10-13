import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
} from '@mui/material';

interface TenantDetailModalProps {
  open: boolean;
  tenant: any;
  onClose: () => void;
}

const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  open,
  tenant,
  onClose,
}) => {
  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value || 'N/A'}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tenant Details</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Basic Information */}
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Organization Name" value={tenant.name} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Slug" value={tenant.slug} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={tenant.type.replace('_', ' ')} size="small" />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={tenant.status.replace('_', ' ')}
                    color={
                      tenant.status === 'active'
                        ? 'success'
                        : tenant.status === 'pending_approval'
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="License Number" value={tenant.licenseNumber} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  License Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={tenant.licenseStatus}
                    color={tenant.licenseStatus === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Contact Information */}
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Contact Person" value={tenant.primaryContactName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Email" value={tenant.primaryContactEmail} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Phone" value={tenant.primaryContactPhone} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Address */}
          <Typography variant="h6" gutterBottom>
            Address
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <InfoRow label="Address Line 1" value={tenant.addressLine1} />
            </Grid>
            <Grid item xs={12}>
              <InfoRow label="Address Line 2" value={tenant.addressLine2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="City" value={tenant.city} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Governorate" value={tenant.governorate} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Postal Code" value={tenant.postalCode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Country" value={tenant.country} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Subscription */}
          <Typography variant="h6" gutterBottom>
            Subscription
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Subscription Tier
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={tenant.subscriptionTier}
                    color={
                      tenant.subscriptionTier === 'enterprise'
                        ? 'primary'
                        : tenant.subscriptionTier === 'professional'
                        ? 'secondary'
                        : 'default'
                    }
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow
                label="Users"
                value={`${tenant.currentUsers} / ${tenant.maxUsers}`}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Metadata */}
          <Typography variant="h6" gutterBottom>
            Metadata
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoRow
                label="Created At"
                value={new Date(tenant.createdAt).toLocaleString()}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow
                label="Updated At"
                value={new Date(tenant.updatedAt).toLocaleString()}
              />
            </Grid>
          </Grid>

          {tenant.suspensionReason && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom color="error">
                Suspension Information
              </Typography>
              <InfoRow label="Reason" value={tenant.suspensionReason} />
              <InfoRow
                label="Suspended At"
                value={new Date(tenant.suspendedAt).toLocaleString()}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TenantDetailModal;