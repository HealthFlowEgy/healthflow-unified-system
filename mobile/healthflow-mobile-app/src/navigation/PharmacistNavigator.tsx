// Sprint 3 - Pharmacist Bottom Tab Navigator
// ------------------------------------------------------------------------------

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import PharmacyDashboardScreen from '../screens/Pharmacist/DashboardScreen';
import PrescriptionQueueScreen from '../screens/Pharmacist/PrescriptionQueueScreen';
import InventoryScreen from '../screens/Pharmacist/InventoryScreen';
import ScannerScreen from '../screens/Pharmacist/ScannerScreen';
import PharmacyProfileScreen from '../screens/Pharmacist/ProfileScreen';
import { colors } from '../theme';

export type PharmacistTabParamList = {
  Dashboard: undefined;
  Queue: undefined;
  Inventory: undefined;
  Scanner: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<PharmacistTabParamList>();

const PharmacistNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Queue':
              iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
              break;
            case 'Inventory':
              iconName = focused ? 'package-variant' : 'package-variant-closed';
              break;
            case 'Scanner':
              iconName = 'barcode-scan';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={PharmacyDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Queue" 
        component={PrescriptionQueueScreen}
        options={{ title: 'Prescriptions' }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={InventoryScreen}
        options={{ title: 'Inventory' }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{ title: 'Scan' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={PharmacyProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default PharmacistNavigator;

// ------------------------------------------------------------------------------