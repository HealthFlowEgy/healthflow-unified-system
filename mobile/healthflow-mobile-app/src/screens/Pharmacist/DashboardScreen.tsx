// Sprint 3 - Pharmacist Dashboard Screen

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Button,
  Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { pharmacyApi } from '../../services/api';
import { colors, spacing, typography } from '../../theme';

interface PharmacyStats {
  pendingPrescriptions: number;
  todayDispensed: number;
  todaySales: number;
  lowStockItems: number;
  expiringItems: number;
}

const PharmacyDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PharmacyStats>({
    pendingPrescriptions: 0,
    todayDispensed: 0,
    todaySales: 0,
    lowStockItems: 0,
    expiringItems: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [currentPharmacy, setCurrentPharmacy] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get current pharmacy and stats
      const response = await pharmacyApi.getDashboardStats();
      setStats(response.data);
      setCurrentPharmacy(response.data.pharmacy);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Pharmacy Info Card */}
        <Card style={styles.pharmacyCard}>
          <Card.Content>
            <View style={styles.pharmacyHeader}>
              <Avatar.Icon
                size={60}
                icon="store"
                style={{ backgroundColor: colors.primary }}
              />
              <View style={styles.pharmacyInfo}>
                <Text style={styles.pharmacyName}>
                  {currentPharmacy?.pharmacyName || 'Loading...'}
                </Text>
                <Text style={styles.pharmacyAddress}>
                  {currentPharmacy?.address}
                </Text>
                <View style={styles.statusContainer}>
                  <Chip
                    icon="check-circle"
                    mode="flat"
                    style={styles.statusChip}
                    textStyle={styles.statusText}
                  >
                    Active
                  </Chip>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="clipboard-list"
            label="Pending"
            value={stats.pendingPrescriptions}
            color={colors.warning}
            onPress={() => navigation.navigate('Queue')}
          />
          <StatCard
            icon="pill"
            label="Dispensed Today"
            value={stats.todayDispensed}
            color={colors.success}
          />
          <StatCard
            icon="currency-usd"
            label="Today's Sales"
            value={`${stats.todaySales.toLocaleString()} EGP`}
            color={colors.primary}
            valueStyle={{ fontSize: 18 }}
          />
          <StatCard
            icon="alert"
            label="Low Stock"
            value={stats.lowStockItems}
            color={colors.error}
            onPress={() => navigation.navigate('Inventory', { filter: 'low_stock' })}
          />
        </View>

        {/* Alerts Section */}
        {(stats.lowStockItems > 0 || stats.expiringItems > 0) && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>Alerts</Text>
            
            {stats.lowStockItems > 0 && (
              <Card style={[styles.alertCard, { borderLeftColor: colors.warning }]}>
                <Card.Content>
                  <View style={styles.alertContent}>
                    <Icon name="alert" size={24} color={colors.warning} />
                    <View style={styles.alertText}>
                      <Text style={styles.alertTitle}>Low Stock Items</Text>
                      <Text style={styles.alertDescription}>
                        {stats.lowStockItems} items need reordering
                      </Text>
                    </View>
                    <Button
                      mode="text"
                      onPress={() => navigation.navigate('Inventory', { filter: 'low_stock' })}
                    >
                      View
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}

            {stats.expiringItems > 0 && (
              <Card style={[styles.alertCard, { borderLeftColor: colors.error }]}>
                <Card.Content>
                  <View style={styles.alertContent}>
                    <Icon name="clock-alert" size={24} color={colors.error} />
                    <View style={styles.alertText}>
                      <Text style={styles.alertTitle}>Expiring Soon</Text>
                      <Text style={styles.alertDescription}>
                        {stats.expiringItems} items expiring within 30 days
                      </Text>
                    </View>
                    <Button
                      mode="text"
                      onPress={() => navigation.navigate('Inventory', { filter: 'expiring' })}
                    >
                      View
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon="barcode-scan"
              label="Scan Prescription"
              color={colors.primary}
              onPress={() => navigation.navigate('Scanner')}
            />
            <QuickActionCard
              icon="clipboard-list"
              label="View Queue"
              color={colors.secondary}
              onPress={() => navigation.navigate('Queue')}
            />
            <QuickActionCard
              icon="package-variant"
              label="Check Inventory"
              color={colors.success}
              onPress={() => navigation.navigate('Inventory')}
            />
            <QuickActionCard
              icon="chart-bar"
              label="Reports"
              color={colors.info}
              onPress={() => navigation.navigate('Reports')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const StatCard: React.FC<{
  icon: string;
  label: string;
  value: number | string;
  color: string;
  onPress?: () => void;
  valueStyle?: any;
}> = ({ icon, label, value, color, onPress, valueStyle }) => (
  <Card style={styles.statCard} onPress={onPress}>
    <Card.Content style={styles.statContent}>
      <Icon name={icon} size={28} color={color} />
      <Text style={[styles.statValue, valueStyle]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card.Content>
  </Card>
);

const QuickActionCard: React.FC<{
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}> = ({ icon, label, color, onPress }) => (
  <Card style={styles.quickActionCard} onPress={onPress}>
    <Card.Content style={styles.quickActionContent}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={32} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pharmacyCard: {
    margin: spacing.md,
    elevation: 2,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacyInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pharmacyName: {
    ...typography.h5,
    color: colors.text,
  },
  pharmacyAddress: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusContainer: {
    marginTop: spacing.sm,
  },
  statusChip: {
    backgroundColor: colors.success + '20',
    alignSelf: 'flex-start',
  },
  statusText: {
    color: colors.success,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    elevation: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  alertsSection: {
    padding: spacing.md,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  alertCard: {
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    elevation: 1,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  alertTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  alertDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    marginBottom: spacing.md,
    elevation: 1,
  },
  quickActionContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    ...typography.body2,
    color: colors.text,
    textAlign: 'center',
  },
});

export default PharmacyDashboardScreen;

// ------------------------------------------------------------------------------