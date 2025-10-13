// Sprint 2 - Inventory Check Component
// ------------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { pharmacyApi } from '../../services/api';

interface InventoryCheckProps {
  prescription: any;
  pharmacyId?: string;
  onVerified: () => void;
}

const InventoryCheck: React.FC<InventoryCheckProps> = ({
  prescription,
  pharmacyId,
  onVerified,
}) => {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<any[]>([]);
  const [allAvailable, setAllAvailable] = useState(false);

  useEffect(() => {
    checkInventory();
  }, [prescription, pharmacyId]);

  const checkInventory = async () => {
    if (!pharmacyId) return;

    try {
      setLoading(true);
      // Get prescription with availability info
      const response = await pharmacyApi.getPrescription(
        pharmacyId,
        prescription.id
      );

      const availabilityData = response.data.medicationAvailability || [];
      setAvailability(availabilityData);
      setAllAvailable(availabilityData.every((med: any) => med.canFulfill));
    } catch (error) {
      console.error('Failed to check inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Inventory Availability Check
      </Typography>

      {!allAvailable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Some medications are not available in sufficient quantities. Partial
          dispensing may be required.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Medicine</TableCell>
              <TableCell align="right">Required</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Price (EGP)</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availability.map((med: any, index: number) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {med.name}
                  </Typography>
                </TableCell>
                <TableCell align="right">{med.quantity || 1}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color={med.canFulfill ? 'success.main' : 'error.main'}
                    fontWeight={600}
                  >
                    {med.available}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {med.price ? med.price.toFixed(2) : 'N/A'}
                </TableCell>
                <TableCell>
                  {med.canFulfill ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="In Stock"
                      size="small"
                      color="success"
                    />
                  ) : med.available > 0 ? (
                    <Chip
                      icon={<WarningIcon />}
                      label="Partial"
                      size="small"
                      color="warning"
                    />
                  ) : (
                    <Chip
                      icon={<ErrorIcon />}
                      label="Out of Stock"
                      size="small"
                      color="error"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Box display="flex" justifyContent="flex-end">
        <Button variant="contained" onClick={onVerified}>
          {allAvailable ? 'Proceed to Patient Verification' : 'Continue with Partial Dispensing'}
        </Button>
      </Box>
    </Box>
  );
};

export default InventoryCheck;

// ------------------------------------------------------------------------------