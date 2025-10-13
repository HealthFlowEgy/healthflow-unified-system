/**
 * Patient Details Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tab,
  Tabs,
  Alert,
  CircularProgress
} from '@mui/material';
import { Edit, Description, Warning, History } from '@mui/icons-material';
import { apiService } from '../../services/apiService';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (id) {
      loadPatient();
    }
  }, [id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPatient(id!);
      setPatient(response.data);
    } catch (error) {
      console.error('Failed to load patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!patient) {
    return (
      <Alert severity="error">Patient not found</Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {patient.firstName} {patient.lastName}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {calculateAge(patient.dateOfBirth)} years • {patient.gender} • {patient.nationalId || 'No ID'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/patients/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            startIcon={<Description />}
            onClick={() => navigate(`/prescriptions/new?patientId=${id}`)}
          >
            New Prescription
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Overview" />
          <Tab label="Allergies" />
          <Tab label="Medical History" />
          <Tab label="Prescriptions" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Personal Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Full Name" secondary={`${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Date of Birth" secondary={new Date(patient.dateOfBirth).toLocaleDateString()} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Gender" secondary={patient.gender} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Blood Type" secondary={patient.bloodType || 'Not specified'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="National ID" secondary={patient.nationalId || 'Not specified'} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Contact Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Email" secondary={patient.email || 'Not provided'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Phone" secondary={patient.phone || 'Not provided'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Alternate Phone" secondary={patient.alternatePhone || 'Not provided'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Address" secondary={patient.address || 'Not provided'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="City" secondary={`${patient.city || 'N/A'}, ${patient.governorate || 'N/A'}`} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Emergency Contact */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Emergency Contact
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Name" secondary={patient.emergencyContactName || 'Not provided'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Phone" secondary={patient.emergencyContactPhone || 'Not provided'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Relation" secondary={patient.emergencyContactRelation || 'Not provided'} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Medical Info */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Medical & Insurance
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Height" secondary={patient.height || 'Not recorded'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Weight" secondary={patient.weight || 'Not recorded'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Insurance Provider" secondary={patient.insuranceProvider || 'None'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Insurance Number" secondary={patient.insuranceNumber || 'N/A'} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Allergies
              </Typography>
              <Button size="small">Add Allergy</Button>
            </Box>

            {patient.allergies && patient.allergies.length > 0 ? (
              <List>
                {patient.allergies.map((allergy: any, index: number) => (
                  <React.Fragment key={allergy.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Warning color="error" fontSize="small" />
                            <Typography variant="body1" fontWeight="medium">
                              {allergy.allergen}
                            </Typography>
                            <Chip
                              label={allergy.severity}
                              size="small"
                              color={
                                allergy.severity === 'life-threatening' ? 'error' :
                                allergy.severity === 'severe' ? 'warning' : 'default'
                              }
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Type: {allergy.allergyType} • Reaction: {allergy.reaction || 'Not specified'}
                            </Typography>
                            {allergy.notes && (
                              <Typography variant="body2" color="text.secondary">
                                Notes: {allergy.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index < patient.allergies.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">No known allergies recorded</Alert>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Medical History
              </Typography>
              <Button size="small">Add Entry</Button>
            </Box>

            {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
              <List>
                {patient.medicalHistory.map((entry: any, index: number) => (
                  <React.Fragment key={entry.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History fontSize="small" />
                            <Typography variant="body1" fontWeight="medium">
                              {entry.condition}
                            </Typography>
                            <Chip label={entry.status} size="small" color={entry.status === 'active' ? 'error' : 'default'} />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Type: {entry.conditionType} • Diagnosed: {entry.diagnosisDate ? new Date(entry.diagnosisDate).toLocaleDateString() : 'N/A'}
                            </Typography>
                            {entry.notes && (
                              <Typography variant="body2" color="text.secondary">
                                {entry.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index < patient.medicalHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">No medical history recorded</Alert>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Prescriptions
            </Typography>
            <Alert severity="info">
              Prescription history will be displayed here
            </Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}