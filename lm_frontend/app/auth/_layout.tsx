import { useAuth } from '../../hooks/useAuth';
import { Redirect, Slot, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';


// auth/_layout.tsx - flow-ul pentru autentificare

export default function AuthLayout() {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const [cancelledVerification, setCancelledVerification] = useState(false);

    // if the user has cancelled the verification, set the state and redirect to login
    useEffect(() => {
        AsyncStorage.getItem('cancelledVerification').then(value => {
            if (value === 'true') {
                setCancelledVerification(true);
            }
        });
    }, []);


    if (loading) return null;

    // if the user is logged in but not verified, redirect to email verification
    const isVerified = segments[1] === 'emailVerified';
    if (user && !user.emailVerified && !isVerified && !cancelledVerification) {
      return <Redirect href="/auth/emailVerified" />;
    }

    if (user && user.emailVerified) {
      return <Redirect href="/" />;
    }

    return <Slot />;
}