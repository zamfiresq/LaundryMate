import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ScrollView } from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { sendEmailVerification } from 'firebase/auth';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from '@/firebaseConfig';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);  
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  // password validation function
  const getPasswordErrors = (password: string) => {
    const errors = [];
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (password.length < 8) {
      errors.push({ message: 'At least 8 characters', fulfilled: false });
    } else {
      errors.push({ message: 'At least 8 characters', fulfilled: true });
    }

    if (!/[A-Z]/.test(password)) {
      errors.push({ message: 'At least one uppercase letter', fulfilled: false });
    } else {
      errors.push({ message: 'At least one uppercase letter', fulfilled: true });
    }

    if (!/\d/.test(password)) {
      errors.push({ message: 'At least one number', fulfilled: false });
    } else {
      errors.push({ message: 'At least one number', fulfilled: true });
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push({ message: 'At least one special character', fulfilled: false });
    } else {
      errors.push({ message: 'At least one special character', fulfilled: true });
    }

    return errors;
  };


  // handle register button
  // check if all fields are filled
  const handleRegister = async () => {
    setSubmitted(true);
    if (!name || !surname || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.some(error => !error.fulfilled)) {
      Alert.alert(
        'Weak password',
        'Please fulfill all password requirements.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    // verify mail before creating the account
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Setting displayName:', `${name} ${surname}`);
      await updateProfile(userCredential.user, {
        displayName: `${name} ${surname}`,
      });
      await userCredential.user.reload();
      console.log('Reloaded user:', auth.currentUser?.displayName);
      await sendEmailVerification(userCredential.user);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: name,
        lastName: surname,
        email: email,
        createdAt: new Date().toISOString(),
      });
      Alert.alert(
        "Email verification",
        "We've sent you a confirmation email. Please verify your address before logging in.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/(tabs)/auth/emailVerified')
          }
        ]
      );
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setSurname('');
      setSubmitted(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const passwordErrors = getPasswordErrors(password);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>LaundryMate</Text>
          <Image 
            source={require('@/assets/images/SignUp.png')} 
            style={{ width: 140, height: 140, resizeMode: 'contain', marginBottom: 20 }} 
          />
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Fill in your details to get started</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#8c8888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor={"#8c8888"}
              value={name}
              onChangeText={setName}
            />
          </View>
          {submitted && !name && <Text style={{ color: 'red', marginBottom: 8 }}>First name is required.</Text>}

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#8c8888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor={"#8c8888"}
              value={surname}
              onChangeText={setSurname}
            />
          </View>
          {submitted && !surname && <Text style={{ color: 'red', marginBottom: 8 }}>Last name is required.</Text>}

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#8c8888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={"#8c8888"}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {submitted && !email && <Text style={{ color: 'red', marginBottom: 8 }}>Email is required.</Text>}

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#8c8888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={"#8c8888"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry ={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#8c8888"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>
          {submitted && !password && <Text style={{ color: 'red', marginBottom: 8 }}>Password is required.</Text>}
          
          {passwordErrors.map((error, index) => (
            <Text key={index} style={{ color: error.fulfilled ? 'green' : 'red', marginBottom: 5 }}>
              • {error.message}
            </Text>
          ))}
          <View style={{ marginBottom: 10 }} />

          { /* confirm password */ }
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#8c8888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={"#8c8888"}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry ={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#8c8888"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>
          {submitted && !confirmPassword && <Text style={{ color: 'red', marginBottom: 4 }}>Please confirm your password.</Text>}
          {submitted && confirmPassword && confirmPassword !== password && (
            <Text style={{ color: 'red', marginBottom: 8 }}>Passwords do not match.</Text>
          )}

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Sign up</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={() => router.push("/(tabs)/auth/login")}
          >
            <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


// css styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef8e86',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4d4949',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666262',
  },
  formContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#ef8e86',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#4C51BF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#666262',
  },
  loginTextBold: {
    color: '#ef8e86',
    fontWeight: '600',
  },
});