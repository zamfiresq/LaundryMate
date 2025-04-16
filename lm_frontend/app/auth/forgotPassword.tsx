import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { auth } from '@/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'Check your email to reset your password.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color="#5bafb5" style={styles.backButton} />
      </TouchableOpacity>
      <Text style={styles.title}>Reset your password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TouchableOpacity onPress={handlePasswordReset} style={styles.button}>
        <Text style={styles.buttonText}>Send reset email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#F7FAFC' },
  backButton: { position: 'absolute', top: 25, left: 10, padding: 10 },
  backButtonText: { color: '#5bafb5', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, marginBottom: 20, textAlign: 'center', fontWeight: '600', color: '#4d4949' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 16, marginBottom: 20 },
  button: { backgroundColor: '#5bafb5', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#4C51BF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 17 },

});