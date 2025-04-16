import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBjdKDugD_Fp7TghU8kMW_-jEGhW-LCN8o',
  authDomain: 'laundrymate-bb74e.firebaseapp.com',
  projectId: 'laundrymate-bb74e',
  storageBucket: 'laundrymate-bb74e.appspot.com',
  messagingSenderId: '281434732147',
  appId: '1:281434732147:android:3f6047f46df4a2580d1c06'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app);

export { auth, db };