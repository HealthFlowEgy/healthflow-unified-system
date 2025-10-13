import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Alert, CircularProgress } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/patients/${user?.id}`);
      const patient = response.data.data;
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email || '',
        phone: patient.phone || '',
        dateOfBirth: patient.dateOfBirth || '',
        gender: patient.gender || '',
        address: patient.address || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await apiService.put(`/api/patients/${user?.id}`, formData);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>My Profile</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="First Name" value={formData.firstName} 
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Last Name" value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Email" type="email" value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Phone" value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Address" multiline rows={3} value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
