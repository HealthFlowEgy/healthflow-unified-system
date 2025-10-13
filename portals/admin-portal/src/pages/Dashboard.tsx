import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { People, LocalHospital, CalendarToday, Description } from '@mui/icons-material';
import api from '../services/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>({});

  useEffect(() => {
    api.get('/analytics/metrics').then(res => setMetrics(res.data.data)).catch(console.error);
  }, []);

  const StatCard = ({ title, value, icon, color }: any) => (
    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography color="textSecondary" gutterBottom>{title}</Typography>
        <Typography variant="h4">{value || 0}</Typography>
      </Box>
      <Box sx={{ color, fontSize: 48 }}>{icon}</Box>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Total Patients" value={metrics.totalPatients} icon={<People />} color="primary.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Total Doctors" value={metrics.totalDoctors} icon={<LocalHospital />} color="secondary.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Appointments" value={metrics.totalAppointments} icon={<CalendarToday />} color="success.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Prescriptions" value={metrics.totalPrescriptions} icon={<Description />} color="warning.main" /></Grid>
      </Grid>
    </Box>
  );
}
