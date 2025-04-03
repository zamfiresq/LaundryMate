import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, deleteDoc, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const [userData, setUserData] = useState<DocumentData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  const showDeleteConfirmation = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDeleteAccount }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    Alert.prompt(
      'Confirm Password',
      'Please enter your password to permanently delete your account.',
      async (password) => {
        if (!password) return Alert.alert('Error', 'Password is required.');
        try {
          if (!user.email) throw new Error('User email is null.');
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);

          await deleteDoc(doc(db, 'users', user.uid));
          await deleteUser(user);
          Alert.alert('Account deleted', 'Your account has been successfully deleted.');
          router.replace('/auth/login');
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
      },
      'secure-text'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Ionicons name="person-circle-outline" size={100} color="#ccc" />
      </View>
      {userData ? (
        <>
          <Text style={styles.nameText}>{userData.firstName} {userData.lastName}</Text>
          <Text style={styles.metaText}>{userData.email}</Text>
        </>
      ) : (
        <Text style={styles.metaText}>Loading user data...</Text>
      )}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={showDeleteConfirmation}>
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
    backgroundColor: '#F7FAFC'
  },
  avatarContainer: {
    marginBottom: 20
  },
  nameText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333'
  },
  metaText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8
  },
  signOutButton: {
    marginTop: 40,
    backgroundColor: '#ff4d4d',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  deleteButton: {
    marginTop: 16,
    backgroundColor: '#e63946',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
