import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function EmailVerified() {
  const [resendAvailable, setResendAvailable] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [cancelled, setCancelled] = useState(false);


  // check if the user has cancelled the verification
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !cancelled) {
        await user.reload();
        if (user.emailVerified) {
          router.replace('/auth/login'); // redirect to login page if the user is verified
        }
      }
    });


    // timer for resending the email verification
    let timer: any;
    if (!resendAvailable) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendAvailable(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }


    // return a cleanup function to unsubscribe from the auth state listener
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [resendAvailable, cancelled]);


  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={async () => {
          await AsyncStorage.setItem('cancelledVerification', 'true');
          setCancelled(true);
          router.replace('/auth/login'); // redirect to login page if the user cancelled the verification
        }}
        style={{ position: 'absolute', top: 60, left: 30 }}
      >
        <Ionicons name="arrow-back" size={24} color="#5bafb5" />
      </TouchableOpacity>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>{'\n'}We sent a verification link to your email. {'\n'} 
        Please check your inbox. </Text>

      <TouchableOpacity
        onPress={async () => {
          const user = getAuth().currentUser;
          if (user) {
            await user.reload();
            if (user.emailVerified) { // if user is verified, redirect to auth/login
              router.replace('/auth/login');
            } else {
              Alert.alert("Still not verified", "Your email is not verified yet. Please check your inbox.");
            }
          }
        }}
        style={{ marginTop: 20 }}
      >
        <Ionicons name="refresh" size={40} color="#5bafb5" />
      </TouchableOpacity>

      <View style={{ marginTop: 45, alignItems: 'center'}}>
        <Text style={{ color: 'gray', marginBottom: 10}}>
          {resendAvailable ? 'You can resend the verification email' : `Please wait ${countdown}s to resend email`}
        </Text>


        {/* countdown bar */}
        {!resendAvailable && (
          <View style={{ height: 6, width: 200, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${((60 - countdown) / 60) * 100}%`, backgroundColor: '#ccc' }} />
          </View>
        )}

        {/* resend button */}
        {resendAvailable && (
          <TouchableOpacity
            onPress={async () => {
              const user = getAuth().currentUser;
              if (user) {
                await sendEmailVerification(user);
                Alert.alert("Verification email resent", "Check your inbox for a new verification link.");
                setResendAvailable(false);
                setCountdown(60);
              }
            }}
            style={{
              marginTop: 10,
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: '#5bafb5',
              borderRadius: 6,
              shadowColor: '#4C51BF',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 4.65,
              elevation: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Resend</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}



// styles
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 6, color: '#4d4949' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 20 },
});