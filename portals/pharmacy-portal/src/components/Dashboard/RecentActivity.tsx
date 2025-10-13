// Sprint 2 - Recent Activity Component
// ------------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  LocalPharmacy as PharmacyIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { pharmacyApi } from '../../services/api';
import { formatDate } from '../../utils/formatters';

interface Activity {
  id: string;
  type: 'dispensing' | 'inventory' | 'prescription';
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  pharmacyId?: string;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ pharmacyId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pharmacyId) {
      loadActivities();
    }
  }, [pharmacyId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await pharmacyApi.getDispensingHistory(pharmacyId!, {
        page: 1,
        limit: 5,
      });

      const activityData = response.data.items.map((item: any) => ({
        id: item.id,
        type: 'dispensing',
        description: `Dispensed prescription for ${item.prescription.patientName}`,
        timestamp: item.dispensedAt,
      }));

      setActivities(activityData);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'dispensing':
        return <PharmacyIcon />;
      case 'inventory':
        return <InventoryIcon />;
      case 'prescription':
        return <PersonIcon />;
      default:
        return <PharmacyIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (activities.length === 0) {
    return (
      <Typography color="text.secondary" align="center" py={3}>
        No recent activity
      </Typography>
    );
  }

  return (
    <List>
      {activities.map((activity) => (
        <ListItem key={activity.id}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getIcon(activity.type)}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={activity.description}
            secondary={formatDate(activity.timestamp)}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default RecentActivity;

// ------------------------------------------------------------------------------