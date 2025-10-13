// Sprint 2 - Prescription Verification Component
// ------------------------------------------------------------------------------

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface PrescriptionVerificationProps {
  prescription: any;
  onVerified: () => void;
}

const PrescriptionVerification: React.FC<PrescriptionVerificationProps> = ({
  prescription,
  onVerified,
}) => {
  if (!prescription) {
    return <Alert severity="error">Prescription not found</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Prescription Details
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Prescription Number
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {prescription.prescriptionNumber}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Status
              </Typography>
              <Chip
                label={prescription.status}
                color="success"
                size="small"
                icon={<CheckCircleIcon />}
              />
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Patient Name
              </Typography>
              <Typography variant="body1">
                {prescription.patientName}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Age
              </Typography>
              <Typography variant="body1">
                {prescription.patientAge} years
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Doctor
              </Typography>
              <Typography variant="body1">
                {prescription.doctorName}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">
                License
              </Typography>
              <Typography variant="body1">
                {prescription.doctorLicense}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom>
        Prescribed Medications
      </Typography>

      <Card sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Medicine</TableCell>
              <TableCell>Dosage</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prescription.medications.map((med: any, index: number) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {med.name}
                  </Typography>
                </TableCell>
                <TableCell>{med.dosage}</TableCell>
                <TableCell>{med.frequency}</TableCell>
                <TableCell>{med.duration}</TableCell>
                <TableCell>{med.quantity || 1}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {prescription.diagnosis && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Diagnosis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {prescription.diagnosis}
            </Typography>
          </CardContent>
        </Card>
      )}

      {prescription.status === 'validated' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          This prescription has been validated and is ready for dispensing.
        </Alert>
      )}

      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={onVerified}
          disabled={prescription.status !== 'validated'}
        >
          Proceed to Inventory Check
        </Button>
      </Box>
    </Box>
  );
};

export default PrescriptionVerification;

// ------------------------------------------------------------------------------