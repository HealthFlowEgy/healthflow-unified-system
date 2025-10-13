// Sprint 3 - Push Notification Service

import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
  AuthorizationStatus,
} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATION_CHANNEL_ID = 'healthflow-channel';

interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  type?: string;
  priority?: 'high' | 'default' | 'low';
}

class NotificationService {
  private fcmToken: string | null = null;

  async initialize() {
    // Request permissions
    const authStatus = await this.requestPermissions();
    
    if (authStatus === AuthorizationStatus.AUTHORIZED) {
      // Create notification channel (Android)
      await this.createNotificationChannel();
      
      // Get FCM token
      await this.getFCMToken();
      
      // Setup listeners
      this.setupListeners();
      
      // Setup background handler
      this.setupBackgroundHandler();
    }
  }

  async requestPermissions(): Promise<AuthorizationStatus> {
    const settings = await notifee.requestPermission();
    
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('iOS notification permission denied');
      }
    }

    return settings.authorizationStatus;
  }

  async createNotificationChannel() {
    await notifee.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'HealthFlow Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }

  async getFCMToken(): Promise<string | null> {
    try {
      // Check if we have a stored token
      const storedToken = await AsyncStorage.getItem('fcm_token');
      
      if (storedToken) {
        this.fcmToken = storedToken;
        return storedToken;
      }

      // Get new token
      const token = await messaging().getToken();
      
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem('fcm_token', token);
        
        // Send token to backend
        await this.sendTokenToBackend(token);
        
        return token;
      }

      return null;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  async sendTokenToBackend(token: string) {
    try {
      // TODO: Send token to your backend API
      console.log('FCM Token:', token);
    } catch (error) {
      console.error('Failed to send token to backend:', error);
    }
  }

  setupListeners() {
    // Foreground message handler
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Token refresh handler
    messaging().onTokenRefresh(async (token) => {
      this.fcmToken = token;
      await AsyncStorage.setItem('fcm_token', token);
      await this.sendTokenToBackend(token);
    });

    // Notification interaction handler
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        await this.handleNotificationPress(detail.notification);
      }
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        await this.handleNotificationPress(detail.notification);
      }
    });
  }

  setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });
  }

  async displayNotification(remoteMessage: any) {
    const { notification, data } = remoteMessage;

    try {
      await notifee.displayNotification({
        title: notification?.title || 'HealthFlow',
        body: notification?.body || '',
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_notification',
          largeIcon: data?.largeIcon,
          style: data?.style
            ? {
                type: AndroidStyle.BIGTEXT,
                text: notification?.body || '',
              }
            : undefined,
        },
        ios: {
          sound: 'default',
          badgeCount: data?.badgeCount ? parseInt(data.badgeCount) : undefined,
        },
        data: data || {},
      });
    } catch (error) {
      console.error('Failed to display notification:', error);
    }
  }

  async handleNotificationPress(notification: any) {
    const { data } = notification;

    if (!data) return;

    // Route based on notification type
    switch (data.type) {
      case 'new_prescription':
        // Navigate to prescription details
        console.log('Navigate to prescription:', data.prescriptionId);
        break;

      case 'prescription_validated':
        // Navigate to validated prescription
        console.log('Navigate to validated prescription:', data.prescriptionId);
        break;

      case 'low_stock':
        // Navigate to inventory
        console.log('Navigate to inventory:', data.itemId);
        break;

      case 'medicine_recall':
        // Navigate to recall details
        console.log('Navigate to recall:', data.recallId);
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  async scheduleLocalNotification(payload: NotificationPayload) {
    try {
      await notifee.displayNotification({
        title: payload.title,
        body: payload.body,
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
        data: payload.data || {},
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  async cancelNotification(notificationId: string) {
    try {
      await notifee.cancelNotification(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await notifee.cancelAllNotifications();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await notifee.getBadgeCount();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number) {
    try {
      await notifee.setBadgeCount(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async incrementBadgeCount() {
    try {
      const currentCount = await this.getBadgeCount();
      await this.setBadgeCount(currentCount + 1);
    } catch (error) {
      console.error('Failed to increment badge count:', error);
    }
  }

  async clearBadge() {
    try {
      await notifee.setBadgeCount(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }
}

export const notificationService = new NotificationService();

export const setupNotifications = async () => {
  await notificationService.initialize();
};

// ------------------------------------------------------------------------------