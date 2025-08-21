import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';
import '../i18n';
import { useColorScheme } from '../hooks/useColorScheme';
import { useAuth } from '../hooks/useAuth';
import { ThemeProvider as CustomThemeProvider } from '@/context/ThemeContext';
import { registerForPushNotificationsAsync } from '@/src/utils/notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import * as Notifications from 'expo-notifications';

// layout for root stack -> global stack
// prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // loading user data

  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // push notifications
  useEffect(() => {
    const setupNotifications = async () => {
      if (!user) return;
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await setDoc(doc(db, 'users', user.uid), {
          fcmToken: token,
        }, { merge: true });
      }
    };
  
    setupNotifications();
  }, [user]);

  // notification handler
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const { path } = Linking.parse(url);
      if (path === 'verify') {
        router.replace({
          pathname: '/auth/emailVerified',
        });
      }
    });
    return () => sub.remove();
  }, []);

if (!loaded || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Se incarca aplicatia...
          {'\n'}loaded: {String(loaded)} | authLoading: {String(loading)}
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CustomThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </CustomThemeProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}