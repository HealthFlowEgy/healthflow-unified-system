/**
 * Prescription Creation Wizard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add, Delete, NavigateNext, NavigateBefore, Send } from '@mui/icons-material';
import { apiService } from '../../services/apiService';

const steps = ['Select Patient', 'Add Medications', 'Review & Sign', 'Submit'];

export default function PrescriptionWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Patient Selection
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearch, setPatientSearch] = useState('');

  // Prescription Data
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [medications, setMedications] = useState<any[]>([]);

  // Medicine Search
  const [medicines, setMedicines] = useState<any[]>([]);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedicineDialog, setShowMedicineDialog] = useState(false);

  // Current medication being added
  const [currentMedication, setCurrentMedication] = useState({
    medicineId: '',
    medicineName: '',
    medicineGenericName: '',
    medicineStrength: '',
    medicineForm: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: 1,
    refills: 0,
    instructions: '',
    substitutionAllowed: true
  });

  // Validation Result
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    if (preselectedPatientId) {
      loadPatient(preselectedPatientId);
    } else {
      loadPatients();
    }
  }, []);

  const loadPatients = async () => {
    try {
      const response = await apiService.searchPatients({ query: patientSearch, limit: 50 });
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const loadPatient = async (patientId: string) => {
    try {
      const response = await apiService.getPatient(patientId);
      setSelectedPatient(response.data);
    } catch (error) {
      console.error('Failed to load patient:', error);
    }
  };

  const searchMedicines = async (query: string) => {
    if (query.length < 2) {
      setMedicines([]);
      return;
    }

    try {
      const response = await apiService.searchMedicines({ query, limit: 20 });
      setMedicines(response.data);
    } catch (error) {
      console.error('Failed to search medicines:', error);
    }
  };

  const handleAddMedication = () => {
    if (!currentMedication.medicineId || !currentMedication.dosage || !currentMedication.frequency) {
      setError('Please fill in all required medication fields');
      return;
    }

    setMedications([...medications, { ...currentMedication }]);

    // Reset current medication
    setCurrentMedication({
      medicineId: '',
      medicineName: '',
      medicineGenericName: '',
      medicineStrength: '',
      medicineForm: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      refills: 0,
      instructions: '',
      substitutionAllowed: true
    });

    setShowMedicineDialog(false);
    setError('');
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    // Validate current step
    if (activeStep === 0 && !selectedPatient) {
      setError('Please select a patient');
      return;
    }

    if (activeStep === 1 && medications.length === 0) {
      setError('Please add at least one medication');
      return;
    }

    setError('');
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Create prescription
      const prescriptionData = {
        doctor: {
          id: 'current-doctor-id', // This should come from auth context
          name: 'Dr. Current Doctor',
          license: 'LICENSE123',
          specialty: 'General Practice'
        },
        patient: {
          id: selectedPatient.id,
          name: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          age: calculateAge(selectedPatient.dateOfBirth),
          gender: selectedPatient.gender,
          nationalId: selectedPatient.nationalId
        },
        diagnosis,
        clinicalNotes,
        medications
      };

      const createResponse = await apiService.createPrescription(prescriptionData);
      const prescriptionId = createResponse.data.id;

      // Submit for AI validation
      const validationResponse = await apiService.submitPrescriptionForValidation(prescriptionId);
      setValidationResult(validationResponse.data);

      // Move to final step
      setActiveStep(3);
    } catch (err: any) {
      console.error('Failed to create prescription:', err);
      setError(err.response?.data?.message || 'Failed to create prescription');
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

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // Step 1: Select Patient
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Patient
            </Typography>
            {selectedPatient ? (
              <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </Typography>
                <Typography color="text.secondary">
                  Age: {calculateAge(selectedPatient.dateOfBirth)} • Gender: {selectedPatient.gender}
                </Typography>
                <Typography color="text.secondary">
                  National ID: {selectedPatient.nationalId || 'N/A'}
                </Typography>
                <Button size="small" onClick={() => setSelectedPatient(null)} sx={{ mt: 1 }}>
                  Change Patient
                </Button>
              </Card>
            ) : (
              <Autocomplete
                options={patients}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.nationalId || 'N/A'})`}
                onInputChange={(e, value) => {
                  setPatientSearch(value);
                  loadPatients();
                }}
                onChange={(e, value) => setSelectedPatient(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Patient"
                    placeholder="Start typing patient name or National ID..."
                  />
                )}
              />
            )}
          </Box>
        );

      case 1:
        // Step 2: Add Medications
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Add Medications
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowMedicineDialog(true)}
              >
                Add Medication
              </Button>
            </Box>

            {/* Diagnosis and Notes */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Clinical Notes"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            {/* Medications List */}
            {medications.length === 0 ? (
              <Alert severity="info">
                No medications added yet. Click "Add Medication" to begin.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Medicine</TableCell>
                      <TableCell>Dosage</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {medications.map((med, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {med.medicineName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {med.medicineGenericName} {med.medicineStrength}
                          </Typography>
                        </TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{med.frequency}</TableCell>
                        <TableCell>{med.duration}</TableCell>
                        <TableCell>{med.quantity}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveMedication(index)}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Add Medication Dialog */}
            <Dialog
              open={showMedicineDialog}
              onClose={() => setShowMedicineDialog(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Add Medication</DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Autocomplete
                      options={medicines}
                      getOptionLabel={(option) => `${option.tradeName} (${option.genericName})`}
                      onInputChange={(e, value) => {
                        setMedicineSearch(value);
                        searchMedicines(value);
                      }}
                      onChange={(e, value) => {
                        if (value) {
                          setCurrentMedication({
                            ...currentMedication,
                            medicineId: value.id,
                            medicineName: value.tradeName,
                            medicineGenericName: value.genericName,
                            medicineStrength: value.strength,
                            medicineForm: value.dosageForm
                          });
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search Medicine"
                          placeholder="Start typing medicine name..."
                          required
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Dosage"
                      value={currentMedication.dosage}
                      onChange={(e) => setCurrentMedication({ ...currentMedication, dosage: e.target.value })}
                      placeholder="e.g., 500mg"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Frequency"
                      value={currentMedication.frequency}
                      onChange={(e) => setCurrentMedication({ ...currentMedication, frequency: e.target.value })}
                      placeholder="e.g., 3 times daily"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Duration"
                      value={currentMedication.duration}
                      onChange={(e) => setCurrentMedication({ ...currentMedication, duration: e.target.value })}
                      placeholder="e.g., 7 days"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Quantity"
                      value={currentMedication.quantity}
                      onChange={(e) => setCurrentMedication({ ...currentMedication, quantity: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Instructions"
                      value={currentMedication.instructions}
                      onChange={(e) => setCurrentMedication({ ...currentMedication, instructions: e.target.value })}
                      placeholder="e.g., Take with food"
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowMedicineDialog(false)}>Cancel</Button>
                <Button onClick={handleAddMedication} variant="contained">
                  Add
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );

      case 2:
        // Step 3: Review & Sign
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Prescription
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                PATIENT INFORMATION
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {selectedPatient?.firstName} {selectedPatient?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Age: {calculateAge(selectedPatient?.dateOfBirth)} • Gender: {selectedPatient?.gender}
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                DIAGNOSIS & NOTES
              </Typography>
              <Typography variant="body1">
                <strong>Diagnosis:</strong> {diagnosis || 'N/A'}
              </Typography>
              <Typography variant="body1">
                <strong>Clinical Notes:</strong> {clinicalNotes || 'N/A'}
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                MEDICATIONS ({medications.length})
              </Typography>
              {medications.map((med, index) => (
                <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < medications.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                  <Typography variant="body1" fontWeight="medium">
                    {index + 1}. {med.medicineName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {med.dosage} • {med.frequency} • {med.duration} • Qty: {med.quantity}
                  </Typography>
                  {med.instructions && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Instructions: {med.instructions}
                    </Typography>
                  )}
                </Box>
              ))}
            </Card>
          </Box>
        );

      case 3:
        // Step 4: Validation Result
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Prescription Created Successfully
            </Typography>

            {validationResult && (
              <Box>
                <Alert
                  severity={validationResult.validation.valid ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body1" fontWeight="medium">
                    AI Validation: {validationResult.validation.valid ? 'Passed' : 'Needs Review'}
                  </Typography>
                  <Typography variant="body2">
                    Confidence Score: {(parseFloat(validationResult.prescription.aiValidationScore) * 100).toFixed(0)}%
                  </Typography>
                </Alert>

                <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    PRESCRIPTION NUMBER
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {validationResult.prescription.prescriptionNumber}
                  </Typography>
                </Card>

                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    STATUS
                  </Typography>
                  <Chip
                    label={validationResult.prescription.status}
                    color={validationResult.prescription.status === 'validated' ? 'success' : 'warning'}
                  />
                </Card>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => navigate(`/prescriptions/${validationResult?.prescription.id}`)}
              >
                View Prescription
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/prescriptions/new')}
              >
                Create Another
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        New Prescription
      </Typography>

      {/* Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (

<Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

      {/* Step Content */}
      <Card>
        <CardContent sx={{ minHeight: 400 }}>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {activeStep < 3 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<NavigateBefore />}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/prescriptions')}
            >
              Cancel
            </Button>
            {activeStep === steps.length - 2 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={<Send />}
              >
                {loading ? 'Submitting...' : 'Submit Prescription'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<NavigateNext />}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}