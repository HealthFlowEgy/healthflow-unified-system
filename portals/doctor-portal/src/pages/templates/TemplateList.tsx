/**
 * Template List Page
 * Display and manage prescription templates
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon
} from '@mui/icons-material';
import apiService from '../../services/apiService';

interface Template {
  id: string;
  name: string;
  description: string;
  templateData: any;
  usageCount: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const doctorId = 'current-doctor-id'; // Get from auth context

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/doctors/${doctorId}/templates`);
      setTemplates(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setViewDialogOpen(true);
  };

  const handleEditTemplate = (templateId: string) => {
    navigate(`/templates/edit/${templateId}`);
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await apiService.delete(`/api/doctors/${doctorId}/templates/${selectedTemplate.id}`);
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleToggleStatus = async (template: Template) => {
    try {
      await apiService.patch(`/api/doctors/${doctorId}/templates/${template.id}/toggle`);
      fetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle template status');
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      await apiService.post(`/api/doctors/${doctorId}/templates/${templateId}/use`);
      navigate(`/prescriptions/create?templateId=${templateId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to use template');
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Prescription Templates
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/templates/create')}
        >
          Create Template
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Usage Count</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No templates found. Create your first template to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {template.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                          {template.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={template.usageCount} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {template.lastUsedAt
                            ? new Date(template.lastUsedAt).toLocaleDateString()
                            : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={template.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={template.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleViewTemplate(template)}
                          title="View"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTemplate(template.id)}
                          title="Edit"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(template)}
                          title={template.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {template.isActive ? <ToggleOnIcon color="success" /> : <ToggleOffIcon />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleUseTemplate(template.id)}
                          title="Use Template"
                          disabled={!template.isActive}
                        >
                          <CopyIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* View Template Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Template Details</DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                NAME
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedTemplate.name}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                DESCRIPTION
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedTemplate.description || 'No description'}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                TEMPLATE DATA
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 1 }}>
                <pre style={{ margin: 0, overflow: 'auto' }}>
                  {JSON.stringify(selectedTemplate.templateData, null, 2)}
                </pre>
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    USAGE COUNT
                  </Typography>
                  <Typography variant="body1">
                    {selectedTemplate.usageCount}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    STATUS
                  </Typography>
                  <Chip
                    label={selectedTemplate.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={selectedTemplate.isActive ? 'success' : 'default'}
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template "{selectedTemplate?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTemplate} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

