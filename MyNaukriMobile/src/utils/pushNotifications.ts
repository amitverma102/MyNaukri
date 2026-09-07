import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/notificationsApi';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Notifications handler init error:', e);
  }
}

export async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Notifications) {
    console.log('Push notifications are skipped in Expo Go');
    return;
  }
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#53c5ab',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }
    
    // We get the Expo push token
    token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Send to backend
    try {
      await notificationsApi.registerDeviceToken(token, Platform.OS);
      console.log('Successfully registered device token with backend');
    } catch (error) {
      console.error('Failed to register device token with backend', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
