import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { format } from 'date-fns';

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/appointments', {
        params: { patientId: user?.id }
      });
      setAppointments(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">My Appointments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Book Appointment
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        {appointments.map((apt: any) => (
          <Grid item xs={12} md={6} key={apt.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Dr. {apt.doctorName}</Typography>
                  <Chip label={apt.status} size="small" color="primary" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(apt.appointmentDate), 'PPp')}
                </Typography>
                <Typography variant="body2">{apt.appointmentType}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{apt.visitReason}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
