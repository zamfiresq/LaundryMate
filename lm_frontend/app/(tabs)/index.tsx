import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { getLaundryTip } from '@/src/utils/chat';


// home page - display the last scanned clothes, tip of the day and other useful information
export default function Home() {
  const [clothes, setClothes] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [tip, setTip] = useState('');


  // display the current user's name
  useEffect(() => {
    const fetchDisplayName = async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        console.log('DisplayName:', user.displayName);
        const fullName = user.displayName || '';
        const firstName = fullName.trim().split(' ').slice(0, 2).join(' ');
        setDisplayName(firstName);
      }
    };
    fetchDisplayName();
  }, []);

  // fetch a response from the chat API
  useEffect(() => {
    getLaundryTip("Give me a short and useful laundry tip. Stop using '**' characters").then((response) => {
      setTip(response);
    });
  }, []);

  // fetch the last scanned clothes from the database
  const renderItem = ({}) => {
    // render logic for each clothing item will go here
    return null;
  };

  return (
    // profile button
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Welcome back,</Text>
          <Text style={[styles.title, styles.userName]}>{displayName || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={50} color="#5bafb5"/>
        </TouchableOpacity>
      </View>

      {/* tip of the day */}
      {tip ? (
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={24} color="#207278" style={styles.tipIcon} />
            <Text style={styles.tipTitle}>Tip of the Day</Text>
          </View>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ) : null}

      <View style={styles.clothesSection}>
        <Text style={styles.sectionTitle}>Last scanned clothes</Text>
        {clothes.length === 0 ? (
          <View style={styles.placeholder}>
            <View style={styles.iconContainer}>
              <Ionicons name="shirt-outline" size={55} color="#5bafb5" />
            </View>
            <Text style={styles.emptyText}>Your scanned clothes will appear here</Text>
            {/* <Text style={styles.emptySubtext}>Start scanning your clothes to see them here</Text> */}
          </View>
        ) : (
          <FlatList
            data={clothes}
            keyExtractor={item => item}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </View>
  );
}





// styles
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
    color: '#2D3748',
    marginTop: 5,
  },
  userName: {
    color: '#5bafb5',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: -5,
  },
  clothesSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#2D3748'
  },
  tipCard: {
    backgroundColor: '#e6f7f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#207278',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(32, 114, 120, 0.2)',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(32, 114, 120, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  tipIcon: {
    marginRight: 6,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#207278',
    fontFamily: 'Roboto',
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    fontFamily: 'Roboto',
    fontStyle: 'italic',
  },
  listContainer: {
    paddingBottom: 20,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clothingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#718096',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EBF8FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#aebbbd',
    marginBottom: 70,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  // emptySubtext: {
  //   fontSize: 14,
  //   color: '#718096',
  //   textAlign: 'center',
  // }
});