import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import api from '../services/api';

export default function RoleList() {
  const [roles, setRoles] = useState([]);
  useEffect(() => { api.get('/roles').then(res => setRoles(res.data.data)).catch(console.error); }, []);
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Roles</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Description</TableCell><TableCell>System Role</TableCell></TableRow></TableHead>
          <TableBody>
            {roles.map((role: any) => (
              <TableRow key={role.id}><TableCell>{role.name}</TableCell><TableCell>{role.description}</TableCell><TableCell>{role.isSystemRole ? 'Yes' : 'No'}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
