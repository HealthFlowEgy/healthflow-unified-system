import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Event as EventIcon,
  LocalPharmacy as PharmacyIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  appointmentNumber: string;
  doctorName: string;
  appointmentDate: string;
  appointmentType: string;
  status: string;
}

interface Prescription {
  id: string;
  prescriptionNumber: string;
  doctorName: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch upcoming appointments
      const appointmentsResponse = await apiService.get('/api/appointments/upcoming', {
        params: { patientId: user?.id, limit: 5 }
      });
      setUpcomingAppointments(appointmentsResponse.data.data || []);

      // Fetch recent prescriptions
      const prescriptionsResponse = await apiService.get('/api/prescriptions', {
        params: { patientId: user?.id, limit: 5 }
      });
      setRecentPrescriptions(prescriptionsResponse.data.data || []);

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      scheduled: 'info',
      confirmed: 'success',
      completed: 'default',
      cancelled: 'error',
      pending: 'warning',
      approved: 'success',
      dispensed: 'success',
    };
    return statusColors[status.toLowerCase()] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.firstName}!
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Here's an overview of your health information
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EventIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{upcomingAppointments.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Appointments
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/appointments')}
              >
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PharmacyIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{recentPrescriptions.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Prescriptions
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/prescriptions')}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">Good</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Health Status
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/medical-records')}
              >
                View Records
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Appointments */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Appointments
              </Typography>
              {upcomingAppointments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No upcoming appointments
                </Typography>
              ) : (
                <List>
                  {upcomingAppointments.map((appointment) => (
                    <ListItem
                      key={appointment.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemText
                        primary={`Dr. ${appointment.doctorName}`}
                        secondary={
                          <>
                            {format(new Date(appointment.appointmentDate), 'PPp')}
                            <br />
                            {appointment.appointmentType}
                          </>
                        }
                      />
                      <Chip
                        label={appointment.status}
                        size="small"
                        color={getStatusColor(appointment.status)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Prescriptions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Prescriptions
              </Typography>
              {recentPrescriptions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No recent prescriptions
                </Typography>
              ) : (
                <List>
                  {recentPrescriptions.map((prescription) => (
                    <ListItem
                      key={prescription.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemText
                        primary={`Prescription #${prescription.prescriptionNumber}`}
                        secondary={
                          <>
                            Dr. {prescription.doctorName}
                            <br />
                            {format(new Date(prescription.createdAt), 'PP')}
                          </>
                        }
                      />
                      <Chip
                        label={prescription.status}
                        size="small"
                        color={getStatusColor(prescription.status)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

