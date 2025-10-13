import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', firstName: '', lastName: '', phone: '', password: '' });

  useEffect(() => {
    if (id) {
      api.get(`/users/${id}`).then(res => setFormData(res.data.data)).catch(console.error);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await api.put(`/users/${id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      navigate('/users');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{id ? 'Edit User' : 'Add User'}</Typography>
      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></Grid>
            {!id && <Grid item xs={12}><TextField fullWidth label="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required /></Grid>}
            <Grid item xs={12}>
              <Button type="submit" variant="contained" sx={{ mr: 2 }}>Save</Button>
              <Button variant="outlined" onClick={() => navigate('/users')}>Cancel</Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}
