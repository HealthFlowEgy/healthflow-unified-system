/**
 * Doctor Dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  People,
  Description,
  TrendingUp,
  Add,
  AccessTime
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardStats {
  totalPrescriptions: string;
  totalPatients: string;
  averagePrescriptionsPerDay: string;
  lastPrescriptionAt: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load statistics
      const statsResponse = await apiService.getDoctorStatistics();
      setStats(statsResponse.data);

      // Load recent prescriptions
      const prescriptionsResponse = await apiService.getPrescriptions({
        limit: 5,
        page: 1
      });
      setRecentPrescriptions(prescriptionsResponse.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Welcome back, Dr. {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your practice today
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Patients
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalPatients || '0'}
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'primary.main', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Prescriptions
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalPrescriptions || '0'}
                  </Typography>
                </Box>
                <Description sx={{ fontSize: 40, color: 'success.main', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Avg. per Day
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.averagePrescriptionsPerDay || '0'}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'info.main', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Last Prescription
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {stats?.lastPrescriptionAt ? new Date(stats.lastPrescriptionAt).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
                <AccessTime sx={{ fontSize: 40, color: 'warning.main', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/prescriptions/new')}
                  size="large"
                >
                  New Prescription
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => navigate('/patients/new')}
                  size="large"
                >
                  Add Patient
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Today's Summary
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Pending Validations"
                    secondary="2 prescriptions awaiting AI validation"
                  />
                  <Chip label="2" color="warning" size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Approved Today"
                    secondary="5 prescriptions approved"
                  />
                  <Chip label="5" color="success" size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Prescriptions */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Recent Prescriptions
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/prescriptions')}
            >
              View All
            </Button>
          </Box>

          {recentPrescriptions.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No prescriptions yet. Create your first prescription!
            </Typography>
          ) : (
            <List>
              {recentPrescriptions.map((prescription) => (
                <ListItem
                  key={prescription.id}
                  divider
                  secondaryAction={
                    <Chip
                      label={prescription.status}
                      color={
                        prescription.status === 'approved' ? 'success' :
                        prescription.status === 'validated' ? 'info' :
                        prescription.status === 'draft' ? 'default' : 'warning'
                      }
                      size="small"
                    />
                  }
                >
                  <ListItemText
                    primary={prescription.patientName}
                    secondary={`${prescription.prescriptionNumber} • ${new Date(prescription.createdAt).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}