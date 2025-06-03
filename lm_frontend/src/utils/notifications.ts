import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync() {
    let token;
  
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
  
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  
    if (finalStatus !== 'granted') {
      alert('Permisiunea pentru notificări a fost refuzată!');
      return null;
    }
  
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("✅ Expo Push Token:", token);
  
    return token;
  }