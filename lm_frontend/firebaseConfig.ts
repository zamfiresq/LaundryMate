import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBjdKDugD_Fp7TghU8kMW_-jEGhW-LCN8o',
  authDomain: 'laundrymate-bb74e.firebaseapp.com',
  projectId: 'laundrymate-bb74e',
  storageBucket: 'laundrymate-bb74e.appspot.com',
  messagingSenderId: '281434732147',
  appId: '1:281434732147:android:3f6047f46df4a2580d1c06',
};

// initializing firebase app
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializing firebase auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export function getFirebaseAuth() {
  console.log("[DEBUG] getFirebaseAuth:", auth);
  return auth;
}

export const db = getFirestore(app);
