import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: 'AIzaSyBjdKDugD_Fp7TghU8kMW_-jEGhW-LCN8o',
  authDomain: 'laundrymate-bb74e.firebaseapp.com',
  projectId: 'laundrymate-bb74e',
  storageBucket: 'laundrymate-bb74e.appspot.com',
  messagingSenderId: '281434732147',
  appId: '1:281434732147:android:3f6047f46df4a2580d1c06'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);