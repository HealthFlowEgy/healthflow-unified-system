// Sprint 3 - Prescription Queue Screen
// ------------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  FAB,
  Menu,
  Button,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { prescriptionApi } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import { formatDistanceToNow } from 'date-fns';

interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientName: string;
  patientAge: number;
  doctorName: string;
  medications: any[];
  status: string;
  createdAt: string;
}

const PrescriptionQueueScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<string>('all');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  useEffect(() => {
    filterPrescriptions();
  }, [searchQuery, prescriptions, currentFilter]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await prescriptionApi.getPending();
      setPrescriptions(response.data.items);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const filterPrescriptions = () => {
    let filtered = prescriptions;

    // Apply status filter
    if (currentFilter !== 'all') {
      filtered = filtered.filter(p => p.status === currentFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.prescriptionNumber.toLowerCase().includes(query) ||
          p.patientName.toLowerCase().includes(query) ||
          p.doctorName.toLowerCase().includes(query)
      );
    }

    setFilteredPrescriptions(filtered);
  };

  const handleFilterSelect = (filter: string) => {
    setCurrentFilter(filter);
    setFilterMenuVisible(false);
  };

  const renderPrescriptionCard = ({ item }: { item: Prescription }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('DispensingWorkflow', { prescriptionId: item.id })
      }
    >
      <Card style={styles.card}>
        <Card.Content>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.prescriptionNumber}>
                {item.prescriptionNumber}
              </Text>
              <Text style={styles.timeAgo}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
              textStyle={{ color: getStatusColor(item.status) }}
            >
              {item.status}
            </Chip>
          </View>

          {/* Patient Info */}
          <View style={styles.patientInfo}>
            <Icon name="account" size={20} color={colors.textSecondary} />
            <View style={styles.patientDetails}>
              <Text style={styles.patientName}>{item.patientName}</Text>
              <Text style={styles.patientAge}>Age: {item.patientAge}</Text>
            </View>
          </View>

          {/* Doctor Info */}
          <View style={styles.doctorInfo}>
            <Icon name="doctor" size={20} color={colors.textSecondary} />
            <Text style={styles.doctorName}>{item.doctorName}</Text>
          </View>

          {/* Medications */}
          <View style={styles.medicationsInfo}>
            <Icon name="pill" size={20} color={colors.textSecondary} />
            <Text style={styles.medicationsCount}>
              {item.medications.length} medication{item.medications.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Action Button */}
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate('DispensingWorkflow', { prescriptionId: item.id })
            }
            style={styles.actionButton}
            icon="pharmacy"
          >
            Dispense
          </Button>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search prescriptions..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon="magnify"
        />
        
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setFilterMenuVisible(true)}
              icon="filter"
              style={styles.filterButton}
            >
              {currentFilter === 'all' ? 'All' : currentFilter}
            </Button>
          }
        >
          <Menu.Item onPress={() => handleFilterSelect('all')} title="All" />
          <Menu.Item onPress={() => handleFilterSelect('validated')} title="Validated" />
          <Menu.Item onPress={() => handleFilterSelect('pending')} title="Pending" />
        </Menu>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{filteredPrescriptions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {prescriptions.filter(p => p.status === 'validated').length}
          </Text>
          <Text style={styles.statLabel}>Ready</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {prescriptions.filter(p => p.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Prescription List */}
      <FlatList
        data={filteredPrescriptions}
        renderItem={renderPrescriptionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="clipboard-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No prescriptions in queue</Text>
          </View>
        }
      />

      {/* FAB for Scanner */}
      <FAB
        icon="barcode-scan"
        style={styles.fab}
        onPress={() => navigation.navigate('Scanner')}
        label="Scan"
      />
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'validated':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'submitted':
      return colors.info;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchbar: {
    flex: 1,
    elevation: 1,
  },
  filterButton: {
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    elevation: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  prescriptionNumber: {
    ...typography.h6,
    color: colors.text,
  },
  timeAgo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusChip: {
    height: 28,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  patientDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  patientName: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
  },
  patientAge: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  doctorName: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  medicationsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  medicationsCount: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body1,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
});

export default PrescriptionQueueScreen;
</artifact>

Great progress! Should I continue with:

1. **Push Notifications Service** - Complete notification implementation
2. **Offline Mode & Data Sync** - SQLite local storage
3. **More Screens** - Inventory management, dispensing workflow
4. **Native Modules Configuration** - iOS/Android specific setup

Which would you like next?