// Sprint 3 - Inventory Management Screen

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  FAB,
  Menu,
  Button,
  IconButton,
  Portal,
  Modal,
  TextInput as PaperInput,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pharmacyApi } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import { useOfflineData } from '../../hooks/useOfflineData';
import { offlineStorage } from '../../services/offlineStorage';
import { formatDistanceToNow } from 'date-fns';

interface InventoryItem {
  id: string;
  medicineName: string;
  scientificName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  sellingPrice: number;
  status: string;
  daysUntilExpiry: number;
}

const InventoryScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<string>(route.params?.filter || 'all');
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  const {
    data: inventoryData,
    loading: offlineLoading,
    isOffline: dataIsOffline,
    refresh: refreshData,
  } = useOfflineData({
    fetchOnline: async () => {
      const response = await pharmacyApi.getInventory();
      return response.data.items;
    },
    getCached: async () => {
      return await offlineStorage.getCachedInventory();
    },
    cacheData: async (data) => {
      await offlineStorage.cacheInventory(data);
    },
  });

  useEffect(() => {
    if (inventoryData) {
      setItems(inventoryData);
      setIsOffline(dataIsOffline);
    }
    setLoading(offlineLoading);
  }, [inventoryData, offlineLoading, dataIsOffline]);

  useEffect(() => {
    filterItems();
  }, [searchQuery, items, currentFilter]);

  const filterItems = () => {
    let filtered = items;

    // Apply status filter
    switch (currentFilter) {
      case 'low_stock':
        filtered = filtered.filter((item) => item.status === 'low_stock');
        break;
      case 'expiring':
        filtered = filtered.filter((item) => item.daysUntilExpiry <= 30);
        break;
      case 'expired':
        filtered = filtered.filter((item) => item.status === 'expired');
        break;
      case 'out_of_stock':
        filtered = filtered.filter((item) => item.quantity === 0);
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.medicineName.toLowerCase().includes(query) ||
          item.scientificName.toLowerCase().includes(query) ||
          item.batchNumber.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleAdjustStock = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setAdjustModalVisible(true);
  };

  const submitStockAdjustment = async () => {
    if (!selectedItem || !adjustmentAmount || !adjustmentReason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const adjustment = parseInt(adjustmentAmount);
    if (isNaN(adjustment)) {
      Alert.alert('Error', 'Invalid adjustment amount');
      return;
    }

    try {
      if (isOffline) {
        // Queue for sync
        await offlineStorage.addToSyncQueue({
          type: 'UPDATE',
          entity: 'inventory',
          data: {
            itemId: selectedItem.id,
            adjustment,
            reason: adjustmentReason,
          },
        });

        Alert.alert('Success', 'Adjustment queued for sync when online');
      } else {
        await pharmacyApi.adjustStock(selectedItem.id, adjustment, adjustmentReason);
        Alert.alert('Success', 'Stock adjusted successfully');
        await refreshData();
      }

      setAdjustModalVisible(false);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error?.message || 'Failed to adjust stock'
      );
    }
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <Card style={styles.card}>
      <Card.Content>
        {/* Header */}
        <View style={styles.itemHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.medicineName}>{item.medicineName}</Text>
            <Text style={styles.scientificName}>{item.scientificName}</Text>
          </View>
          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {item.status.replace('_', ' ')}
          </Chip>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Batch</Text>
            <Text style={styles.detailValue}>{item.batchNumber}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text
              style={[
                styles.detailValue,
                item.quantity === 0 && { color: colors.error },
              ]}
            >
              {item.quantity}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>{item.sellingPrice} EGP</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Expiry</Text>
            <Text
              style={[
                styles.detailValue,
                item.daysUntilExpiry < 30 && { color: colors.error },
              ]}
            >
              {formatDistanceToNow(new Date(item.expiryDate), { addSuffix: true })}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => handleAdjustStock(item)}
            icon="plus-minus"
            compact
          >
            Adjust
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('InventoryDetail', { itemId: item.id })}
            compact
          >
            Details
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Icon name="wifi-off" size={16} color="#ffffff" />
          <Text style={styles.offlineText}>Offline Mode - Data may be outdated</Text>
        </View>
      )}

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search inventory..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <IconButton
              icon="filter"
              onPress={() => setFilterMenuVisible(true)}
              style={styles.filterButton}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setCurrentFilter('all');
              setFilterMenuVisible(false);
            }}
            title="All Items"
          />
          <Menu.Item
            onPress={() => {
              setCurrentFilter('low_stock');
              setFilterMenuVisible(false);
            }}
            title="Low Stock"
          />
          <Menu.Item
            onPress={() => {
              setCurrentFilter('expiring');
              setFilterMenuVisible(false);
            }}
            title="Expiring Soon"
          />
          <Menu.Item
            onPress={() => {
              setCurrentFilter('expired');
              setFilterMenuVisible(false);
            }}
            title="Expired"
          />
          <Menu.Item
            onPress={() => {
              setCurrentFilter('out_of_stock');
              setFilterMenuVisible(false);
            }}
            title="Out of Stock"
          />
        </Menu>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{filteredItems.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {items.filter((i) => i.status === 'low_stock').length}
          </Text>
          <Text style={styles.statLabel}>Low</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {items.filter((i) => i.daysUntilExpiry <= 30).length}
          </Text>
          <Text style={styles.statLabel}>Expiring</Text>
        </View>
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredItems}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="package-variant" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No inventory items found</Text>
          </View>
        }
      />

      {/* FAB for Add Item */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddInventory')}
        label="Add Stock"
      />

      {/* Stock Adjustment Modal */}
      <Portal>
        <Modal
          visible={adjustModalVisible}
          onDismiss={() => setAdjustModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Adjust Stock</Text>

          {selectedItem && (
            <View style={styles.modalContent}>
              <Text style={styles.modalItemName}>{selectedItem.medicineName}</Text>
              <Text style={styles.modalCurrentStock}>
                Current: {selectedItem.quantity} units
              </Text>

              <PaperInput
                label="Adjustment Amount (+ or -)"
                value={adjustmentAmount}
                onChangeText={setAdjustmentAmount}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                placeholder="e.g., +10 or -5"
              />

              <PaperInput
                label="Reason"
                value={adjustmentReason}
                onChangeText={setAdjustmentReason}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Reason for adjustment..."
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setAdjustModalVisible(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={submitStockAdjustment}
                  style={styles.modalButton}
                >
                  Confirm
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'in_stock':
      return colors.success;
    case 'low_stock':
      return colors.warning;
    case 'out_of_stock':
      return colors.error;
    case 'expired':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  offlineText: {
    color: '#ffffff',
    ...typography.caption,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchbar: {
    flex: 1,
    elevation: 1,
  },
  filterButton: {
    margin: 0,
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  medicineName: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  scientificName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusChip: {
    height: 28,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  detailItem: {
    width: '50%',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body2,
    color: colors.text,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  modal: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 12,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalContent: {
    gap: spacing.md,
  },
  modalItemName: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  modalCurrentStock: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default InventoryScreen;
</artifact>

Excellent progress! Would you like me to continue with:

1. **Native Module Configuration** - iOS/Android setup files (Podfile, build.gradle, AndroidManifest.xml)
2. **More Screens** - Patient app screens, medicine search
3. **Testing Configuration** - Jest setup and tests for mobile
4. **Build & Deployment** - Fastlane, CI/CD for mobile apps

Which step should I proceed with?