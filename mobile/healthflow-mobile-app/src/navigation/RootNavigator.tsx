// Sprint 3 - Root Navigation Structure
// ------------------------------------------------------------------------------

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';

// Main App Navigators
import DoctorNavigator from './DoctorNavigator';
import PharmacistNavigator from './PharmacistNavigator';
import PatientNavigator from './PatientNavigator';
import LoadingScreen from '../screens/LoadingScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  DoctorApp: undefined;
  PharmacistApp: undefined;
  PatientApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          {user?.role === 'doctor' && (
            <Stack.Screen name="DoctorApp" component={DoctorNavigator} />
          )}
          {user?.role === 'pharmacist' && (
            <Stack.Screen name="PharmacistApp" component={PharmacistNavigator} />
          )}
          {user?.role === 'patient' && (
            <Stack.Screen name="PatientApp" component={PatientNavigator} />
          )}
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;

// ------------------------------------------------------------------------------