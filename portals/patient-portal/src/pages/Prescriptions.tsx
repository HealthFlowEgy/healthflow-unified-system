import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { format } from 'date-fns';

export default function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/prescriptions', {
        params: { patientId: user?.id }
      });
      setPrescriptions(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>My Prescriptions</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        {prescriptions.map((rx: any) => (
          <Grid item xs={12} key={rx.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Prescription #{rx.prescriptionNumber}</Typography>
                  <Chip label={rx.status} size="small" color="primary" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Dr. {rx.doctorName} - {format(new Date(rx.createdAt), 'PP')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{rx.diagnosis}</Typography>
                {rx.medications && rx.medications.length > 0 && (
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Medicine</TableCell>
                          <TableCell>Dosage</TableCell>
                          <TableCell>Frequency</TableCell>
                          <TableCell>Duration</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rx.medications.map((med: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{med.medicineName}</TableCell>
                            <TableCell>{med.dosage}</TableCell>
                            <TableCell>{med.frequency}</TableCell>
                            <TableCell>{med.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
