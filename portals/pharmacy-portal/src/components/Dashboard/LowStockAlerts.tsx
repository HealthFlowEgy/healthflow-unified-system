// Sprint 2 - Low Stock Alerts Component
// ------------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { pharmacyApi } from '../../services/api';

interface LowStockItem {
  id: string;
  medicineName: string;
  quantity: number;
  minStockLevel: number;
}

interface LowStockAlertsProps {
  pharmacyId?: string;
}

const LowStockAlerts: React.FC<LowStockAlertsProps> = ({ pharmacyId }) => {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pharmacyId) {
      loadLowStockItems();
    }
  }, [pharmacyId]);

  const loadLowStockItems = async () => {
    try {
      setLoading(true);
      const response = await pharmacyApi.getLowStockItems(pharmacyId!);
      setItems(response.data.slice(0, 5)); // Show only top 5
    } catch (error) {
      console.error('Failed to load low stock items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Typography color="text.secondary" align="center" py={2}>
        No low stock items
      </Typography>
    );
  }

  return (
    <List dense>
      {items.map((item) => (
        <ListItem key={item.id}>
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="warning" fontSize="small" />
                <Typography variant="body2">{item.medicineName}</Typography>
              </Box>
            }
            secondary={
              <Box display="flex" gap={1} mt={0.5}>
                <Chip
                  label={`${item.quantity} left`}
                  size="small"
                  color="error"
                />
                <Chip
                  label={`Min: ${item.minStockLevel}`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default LowStockAlerts;

// ------------------------------------------------------------------------------