// Sprint 3 - Doctor Dashboard Screen
// ------------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Button,
  FAB,
  Portal,
  Dialog,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { prescriptionApi } from '../../services/api';
import { colors, spacing, typography } from '../../theme';

interface DashboardStats {
  todayPrescriptions: number;
  pendingPrescriptions: number;
  completedThisWeek: number;
  totalPatients: number;
}

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayPrescriptions: 0,
    pendingPrescriptions: 0,
    completedThisWeek: 0,
    totalPatients: 0,
  });
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await prescriptionApi.list({ limit: 5 });
      setRecentPrescriptions(response.data.items);
      
      // Calculate stats from response
      const today = new Date().toDateString();
      const todayCount = response.data.items.filter(
        (p: any) => new Date(p.createdAt).toDateString() === today
      ).length;
      
      setStats({
        todayPrescriptions: todayCount,
        pendingPrescriptions: response.data.items.filter(
          (p: any) => p.status === 'draft'
        ).length,
        completedThisWeek: response.data.items.filter(
          (p: any) => p.status === 'dispensed'
        ).length,
        totalPatients: 0, // TODO: Get from API
      });
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
        {/* Welcome Card */}
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <View style={styles.welcomeContent}>
              <View>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.doctorName}>{user?.fullName}</Text>
                <Text style={styles.licenseText}>License: {user?.licenseNumber}</Text>
              </View>
              <Avatar.Icon
                size={60}
                icon="doctor"
                style={{ backgroundColor: colors.primary }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="file-document"
            label="Today"
            value={stats.todayPrescriptions}
            color={colors.primary}
          />
          <StatCard
            icon="clock-outline"
            label="Pending"
            value={stats.pendingPrescriptions}
            color={colors.warning}
          />
          <StatCard
            icon="check-circle"
            label="This Week"
            value={stats.completedThisWeek}
            color={colors.success}
          />
          <StatCard
            icon="account-group"
            label="Patients"
            value={stats.totalPatients}
            color={colors.info}
          />
        </View>

        {/* Recent Prescriptions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Prescriptions')}
              compact
            >
              View All
            </Button>
          </View>

          {recentPrescriptions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No recent prescriptions</Text>
              </Card.Content>
            </Card>
          ) : (
            recentPrescriptions.map((prescription: any) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
                onPress={() => navigation.navigate('PrescriptionDetail', { id: prescription.id })}
              />
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="plus-circle"
              label="New Prescription"
              onPress={() => navigation.navigate('NewPrescription')}
              color={colors.primary}
            />
            <QuickActionButton
              icon="account-search"
              label="Find Patient"
              onPress={() => navigation.navigate('Patients')}
              color={colors.secondary}
            />
            <QuickActionButton
              icon="pill"
              label="Medicine Search"
              onPress={() => navigation.navigate('MedicineSearch')}
              color={colors.success}
            />
            <QuickActionButton
              icon="chart-bar"
              label="Reports"
              onPress={() => navigation.navigate('Reports')}
              color={colors.info}
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: 'file-document-plus',
              label: 'New Prescription',
              onPress: () => navigation.navigate('NewPrescription'),
            },
            {
              icon: 'account-plus',
              label: 'New Patient',
              onPress: () => navigation.navigate('NewPatient'),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      </Portal>
    </View>
  );
};

const StatCard: React.FC<{
  icon: string;
  label: string;
  value: number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <Card style={styles.statCard}>
    <Card.Content style={styles.statContent}>
      <Icon name={icon} size={32} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card.Content>
  </Card>
);

const PrescriptionCard: React.FC<{
  prescription: any;
  onPress: () => void;
}> = ({ prescription, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Card style={styles.prescriptionCard}>
      <Card.Content>
        <View style={styles.prescriptionHeader}>
          <View>
            <Text style={styles.patientName}>{prescription.patientName}</Text>
            <Text style={styles.prescriptionDate}>
              {new Date(prescription.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prescription.status) }]}>
            <Text style={styles.statusText}>{prescription.status}</Text>
          </View>
        </View>
        <Text style={styles.medicationCount}>
          {prescription.medications?.length || 0} medications
        </Text>
      </Card.Content>
    </Card>
  </TouchableOpacity>
);

const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
}> = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
      <Icon name={icon} size={32} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return colors.warning;
    case 'submitted':
      return colors.info;
    case 'validated':
      return colors.success;
    case 'dispensed':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcomeCard: {
    margin: spacing.md,
    elevation: 2,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  doctorName: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.xs,
  },
  licenseText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
  },
  emptyCard: {
    elevation: 1,
  },
  emptyText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  prescriptionCard: {
    marginBottom: spacing.md,
    elevation: 1,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  patientName: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text,
  },
  prescriptionDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },
  medicationCount: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quickActionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
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

export default DashboardScreen;
</artifact>

Excellent progress! Would you like me to continue with:

1. **More Mobile Screens** - Pharmacist screens, scanner, inventory
2. **Push Notifications** - Complete notification system
3. **Offline Mode** - Data persistence and sync
4. **Native Modules** - Barcode scanner, biometric auth

Which should I proceed with?