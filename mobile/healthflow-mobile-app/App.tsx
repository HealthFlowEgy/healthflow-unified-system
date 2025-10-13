// Sprint 3 - Main App Entry Point
// ------------------------------------------------------------------------------

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/theme';
import { setupNotifications } from './src/services/notifications';

LogBox.ignoreLogs(['Warning: ...']); // Ignore specific warnings

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

const App: React.FC = () => {
  useEffect(() => {
    // Initialize notifications
    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <AuthProvider>
              <NotificationProvider>
                <NavigationContainer>
                  <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                  <RootNavigator />
                </NavigationContainer>
              </NotificationProvider>
            </AuthProvider>
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

// ------------------------------------------------------------------------------