// Sprint 3 - Doctor Bottom Tab Navigator
// ------------------------------------------------------------------------------

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import DashboardScreen from '../screens/Doctor/DashboardScreen';
import PrescriptionScreen from '../screens/Doctor/PrescriptionScreen';
import PatientSearchScreen from '../screens/Doctor/PatientSearchScreen';
import ProfileScreen from '../screens/Doctor/ProfileScreen';
import { colors } from '../theme';

export type DoctorTabParamList = {
  Dashboard: undefined;
  Prescriptions: undefined;
  Patients: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<DoctorTabParamList>();

const DoctorNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Prescriptions':
              iconName = focused ? 'pill' : 'pill';
              break;
            case 'Patients':
              iconName = focused ? 'account-group' : 'account-group-outline';
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
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Prescriptions" 
        component={PrescriptionScreen}
        options={{ title: 'Prescriptions' }}
      />
      <Tab.Screen 
        name="Patients" 
        component={PatientSearchScreen}
        options={{ title: 'Patients' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default DoctorNavigator;

// ------------------------------------------------------------------------------