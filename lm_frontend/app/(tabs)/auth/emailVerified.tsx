import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';

export default function EmailVerified() {
  const [resendAvailable, setResendAvailable] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          router.replace('/(tabs)/auth/login');
        }
      }
    });

    setTimeout(() => {
      setResendAvailable(true);
    }, 60000);

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email successfully verified!</Text>
      <Text style={styles.subtitle}>Redirecting you to login...</Text>
      <TouchableOpacity onPress={async () => {
        const user = getAuth().currentUser;
        if (user) {
          await user.reload();
          if (user.emailVerified) {
            router.replace('/(tabs)/auth/login');
          } else {
            Alert.alert("Still not verified", "Your email is not verified yet. Please check your inbox.");
          }
        }
      }} style={{ marginTop: 20, padding: 10, backgroundColor: '#007bff', borderRadius: 5 }}>
        <Text style={{ color: 'white' }}>Refresh</Text>
      </TouchableOpacity>
      {resendAvailable && (
        <TouchableOpacity
          onPress={async () => {
            const user = getAuth().currentUser;
            if (user) {
              await sendEmailVerification(user);
              Alert.alert("Verification email resent", "Check your inbox for a new verification link.");
              setResendAvailable(false); // optional: prevent spamming
            }
          }}
          style={{ marginTop: 10, padding: 10, backgroundColor: '#28a745', borderRadius: 5 }}
        >
          <Text style={{ color: 'white' }}>Resend Verification Email</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666' }
});