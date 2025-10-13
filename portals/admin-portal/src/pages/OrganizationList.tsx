import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import api from '../services/api';

export default function OrganizationList() {
  const [orgs, setOrgs] = useState([]);
  useEffect(() => { api.get('/organizations').then(res => setOrgs(res.data.data)).catch(console.error); }, []);
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Organizations</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
          <TableBody>
            {orgs.map((org: any) => (
              <TableRow key={org.id}><TableCell>{org.name}</TableCell><TableCell>{org.type}</TableCell><TableCell>{org.status}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
