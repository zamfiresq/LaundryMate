import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';

export default function Home() {
  const [clothes, setClothes] = useState([]);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const fetchDisplayName = async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        console.log('DisplayName:', user.displayName);
        const fullName = user.displayName || '';
        const lastName = fullName.trim().split(' ').slice(-1)[0];
        setDisplayName(lastName);
      }
    };
    fetchDisplayName();
  }, []);

  const renderItem = ({}) => {
    // Render logic for each clothing item will go here
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {displayName || 'User'}!</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={32} color="#5bafb5" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Last scanned clothes</Text>
      {clothes.length === 0 ? (
        <View style={styles.placeholder}>
          <Ionicons name="shirt-outline" size={60} color="#ccc" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>Your scanned clothes will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={clothes}
          keyExtractor={item => item}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: '#F7FAFC'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4d4949'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333'
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  clothingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748'
  },
  dateText: {
    fontSize: 12,
    color: '#888'
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic'
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  }
});