import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

export default function MedicalRecords() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [allergies, setAllergies] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [vitalSigns, setVitalSigns] = useState([]);

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const [allergiesRes, historyRes, vitalsRes] = await Promise.all([
        apiService.get(`/api/patients/${user?.id}/allergies`),
        apiService.get(`/api/patients/${user?.id}/medical-history`),
        apiService.get(`/api/patients/${user?.id}/vital-signs`)
      ]);
      setAllergies(allergiesRes.data.data || []);
      setMedicalHistory(historyRes.data.data || []);
      setVitalSigns(vitalsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Medical Records</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="Allergies" />
        <Tab label="Medical History" />
        <Tab label="Vital Signs" />
      </Tabs>
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {allergies.map((allergy: any) => (
            <Grid item xs={12} md={6} key={allergy.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{allergy.allergen}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Severity: {allergy.severity}
                  </Typography>
                  <Typography variant="body2">{allergy.reaction}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {medicalHistory.map((history: any) => (
            <Grid item xs={12} key={history.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{history.condition}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Diagnosed: {history.diagnosedDate}
                  </Typography>
                  <Typography variant="body2">{history.notes}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {vitalSigns.map((vital: any) => (
            <Grid item xs={12} md={6} key={vital.id}>
              <Card>
                <CardContent>
                  <Typography variant="body2">BP: {vital.bloodPressure}</Typography>
                  <Typography variant="body2">Heart Rate: {vital.heartRate}</Typography>
                  <Typography variant="body2">Temperature: {vital.temperature}</Typography>
                  <Typography variant="body2">Weight: {vital.weight}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
