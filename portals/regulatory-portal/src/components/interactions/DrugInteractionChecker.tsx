// File: frontend/regulatory-portal/src/components/interactions/InteractionChecker.tsx
// Purpose: Drug interaction checking interface

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Autocomplete,
  TextField,
  Chip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Paper,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { apiClient } from '../../services/api';
import { useTranslation } from 'react-i18next';

const InteractionChecker: React.FC = () => {
  const { t } = useTranslation();
  const [selectedMedicines, setSelectedMedicines] = useState<any[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);

  const searchMedicines = async (query: string) => {
    if (query.length < 2) return;

    setSearchLoading(true);
    try {
      const response = await apiClient.get('/api/v2/medicines/search', {
        params: { q: query, limit: 10 },
      });
      setMedicineOptions(response.data.data);
    } catch (error) {
      console.error('Failed to search medicines:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddMedicine = (medicine: any) => {
    if (!selectedMedicines.find((m) => m.id === medicine.id)) {
      setSelectedMedicines([...selectedMedicines, medicine]);
    }
  };

  const handleRemoveMedicine = (medicineId: string) => {
    setSelectedMedicines(selectedMedicines.filter((m) => m.id !== medicineId));
    setResult(null);
  };

  const handleCheckInteractions = async () => {
    setChecking(true);
    try {
      const response = await apiClient.post('/api/v2/interactions/check', {
        medicines: selectedMedicines.map((m) => ({
          id: m.id,
          name: m.trade_name,
          scientificName: m.scientific_name,
          activeIngredients: m.active_ingredients || [],
        })),
      });
      setResult(response.data.data);
    } catch (error) {
      console.error('Failed to check interactions:', error);
      alert(t('errors.general_error'));
    } finally {
      setChecking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'contraindicated':
        return 'error';
      case 'major':
        return 'error';
      case 'moderate':
        return 'warning';
      case 'minor':
        return 'info';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'contraindicated':
        return <ErrorIcon />;
      case 'major':
        return <WarningIcon />;
      case 'moderate':
        return <InfoIcon />;
      case 'minor':
        return <CheckIcon />;
      default:
        return null;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return '#d32f2f';
      case 'high':
        return '#ed6c02';
      case 'moderate':
        return '#fbc02d';
      case 'low':
        return '#2e7d32';
      default:
        return '#757575';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('interactions.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('interactions.description')}
      </Typography>

      {/* Medicine Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('interactions.selected_medicines')}
          </Typography>

          <Autocomplete
            options={medicineOptions}
            getOptionLabel={(option) => option.trade_name}
            loading={searchLoading}
            onInputChange={(_, value) => searchMedicines(value)}
            onChange={(_, value) => {
              if (value) {
                handleAddMedicine(value);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('interactions.add_medicine')}
                placeholder={t('medicines.search_placeholder')}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
          />

          <Box display="flex" flexWrap="wrap" gap={1}>
            {selectedMedicines.map((medicine) => (
              <Chip
                key={medicine.id}
                label={medicine.trade_name}
                onDelete={() => handleRemoveMedicine(medicine.id)}
                deleteIcon={<DeleteIcon />}
              />
            ))}
          </Box>

          {selectedMedicines.length < 2 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('interactions.add_at_least_two')}
            </Alert>
          )}

          <Button
            variant="contained"
            startIcon={checking ? <CircularProgress size={20} /> : null}
            onClick={handleCheckInteractions}
            disabled={selectedMedicines.length < 2 || checking}
            sx={{ mt: 2 }}
            fullWidth
          >
            {checking ? t('common.loading') : t('interactions.check')}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h3" color={getRiskLevelColor(result.riskLevel)}>
                  {result.interactionCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('interactions.interactions_found')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h3">{result.riskScore}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('interactions.risk_score')}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: 'center',
                  bgcolor: getRiskLevelColor(result.riskLevel),
                  color: 'white',
                }}
              >
                <Typography variant="h4">{result.riskLevel.toUpperCase()}</Typography>
                <Typography variant="body2">
                  {t('interactions.risk_level')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* No Interactions */}
          {result.interactionCount === 0 && (
            <Alert severity="success" icon={<CheckIcon />}>
              <AlertTitle>{t('interactions.no_interactions')}</AlertTitle>
              {t('interactions.safe_combination')}
            </Alert>
          )}

          {/* Interactions List */}
          {result.interactionCount > 0 && (
            <>
              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <AlertTitle>{t('interactions.recommendations')}</AlertTitle>
                  <List dense>
                    {result.recommendations.map((rec: string, idx: number) => (
                      <ListItem key={idx}>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}

              {/* Detailed Interactions */}
              <Typography variant="h6" gutterBottom>
                {t('interactions.detailed_interactions')}
              </Typography>

              {result.interactions.map((detail: any, index: number) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6">
                          {detail.affectedMedications.join(' + ')}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <Chip
                          icon={getSeverityIcon(detail.interaction.severity)}
                          label={t(`interactions.${detail.interaction.severity}`)}
                          color={getSeverityColor(detail.interaction.severity) as any}
                        />
                        <Chip
                          label={t(`interactions.risk_${detail.riskLevel}`)}
                          sx={{
                            bgcolor: getRiskLevelColor(detail.riskLevel),
                            color: 'white',
                          }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                      {t('interactions.description')}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {detail.interaction.description}
                    </Typography>

                    {detail.interaction.clinicalEffects && detail.interaction.clinicalEffects.length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          {t('interactions.clinical_effects')}
                        </Typography>
                        <List dense>
                          {detail.interaction.clinicalEffects.map((effect: string, idx: number) => (
                            <ListItem key={idx}>
                              <ListItemText primary={`• ${effect}`} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}

                    {detail.interaction.mechanism && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          {t('interactions.mechanism')}
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {detail.interaction.mechanism}
                        </Typography>
                      </>
                    )}

                    {detail.interaction.management && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <AlertTitle>{t('interactions.management')}</AlertTitle>
                        {detail.interaction.management}
                      </Alert>
                    )}

                    <Box display="flex" gap={1} mt={2}>
                      <Chip
                        label={`${t('interactions.evidence')}: ${detail.interaction.evidence}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default InteractionChecker;