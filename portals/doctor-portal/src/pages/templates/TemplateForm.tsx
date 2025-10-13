/**
 * Template Form Page
 * Create or edit prescription templates
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Grid
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import apiService from '../../services/apiService';

interface Medication {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function TemplateForm() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isEditMode = Boolean(templateId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  const [medications, setMedications] = useState<Medication[]>([
    {
      medicineName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }
  ]);

  const doctorId = 'current-doctor-id'; // Get from auth context

  useEffect(() => {
    if (isEditMode && templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/doctors/${doctorId}/templates/${templateId}`);
      const template = response.data.data;

      setFormData({
        name: template.name,
        description: template.description || '',
        isActive: template.isActive
      });

      if (template.templateData && template.templateData.medications) {
        setMedications(template.templateData.medications);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updatedMedications = [...medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value
    };
    setMedications(updatedMedications);
  };

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        medicineName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      }
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    const validMedications = medications.filter(med => med.medicineName.trim());
    if (validMedications.length === 0) {
      setError('At least one medication is required');
      return;
    }

    try {
      setLoading(true);

      const templateData = {
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
        templateData: {
          medications: validMedications
        }
      };

      if (isEditMode) {
        await apiService.put(`/api/doctors/${doctorId}/templates/${templateId}`, templateData);
        setSuccess('Template updated successfully');
      } else {
        await apiService.post(`/api/doctors/${doctorId}/templates`, templateData);
        setSuccess('Template created successfully');
      }

      setTimeout(() => {
        navigate('/templates');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {isEditMode ? 'Edit Template' : 'Create Template'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Template Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Template Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Common Cold Treatment"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  placeholder="Brief description of this template"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      name="isActive"
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Medications
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddMedication}
                variant="outlined"
                size="small"
              >
                Add Medication
              </Button>
            </Box>

            {medications.map((medication, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">
                    Medication {index + 1}
                  </Typography>
                  {medications.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveMedication(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Medicine Name"
                      value={medication.medicineName}
                      onChange={(e) => handleMedicationChange(index, 'medicineName', e.target.value)}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Dosage"
                      value={medication.dosage}
                      onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                      placeholder="e.g., 500mg"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Frequency"
                      value={medication.frequency}
                      onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                      placeholder="e.g., Twice daily"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Duration"
                      value={medication.duration}
                      onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                      placeholder="e.g., 7 days"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Instructions"
                      value={medication.instructions}
                      onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                      multiline
                      rows={2}
                      placeholder="Special instructions for this medication"
                    />
                  </Grid>
                </Grid>

                {index < medications.length - 1 && <Divider sx={{ mt: 3 }} />}
              </Box>
            ))}
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Template' : 'Create Template'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => navigate('/templates')}
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Box>
  );
}

