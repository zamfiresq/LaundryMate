import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { getFirebaseAuth, db } from '@/firebaseConfig';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getFirebaseAuth();

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
        const garmentsRef = collection(db, 'users', user.uid, 'garments');
        const q = query(garmentsRef, orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(data);
      } catch (e) {
        Alert.alert('Eroare', 'Nu s-au putut încărca sesiunile.');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [auth.currentUser]);

  const handleDelete = async (id: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await deleteDoc(doc(db, 'users', user.uid, 'garments', id));
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-a putut șterge sesiunea.');
    }
  };

  const handleReuse = (session: any) => {
    // Poți implementa logica de reutilizare (ex: trimite din nou la AI pentru recomandare)
    Alert.alert('Reutilizare', 'Funcționalitatea de reutilizare poate fi personalizată.');
  };

  if (loading) {
    return <View style={[styles.container, { backgroundColor: currentTheme.background }]}><ActivityIndicator size="large" color={currentTheme.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }] }>
      <Text style={[styles.title, { color: currentTheme.text }]}>{t('history.title')}</Text>
      {sessions.length === 0 ? (
        <Text style={[styles.text, { color: currentTheme.textSecondary }]}>{t('history.description')}</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, shadowColor: currentTheme.primary }] }>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {item.items && item.items[0]?.image && (
                  <Image source={{ uri: item.items[0].image }} style={styles.image} />
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.programBadgeRow}>
                    <Text style={styles.programBadge}>{item.program || '-'}</Text>
                  </View>
                  <View style={{ marginBottom: 6 }}>
                    {item.items && item.items.map((haina: any, idx: number) => (
                      <View key={haina.id} style={styles.hainaRow}>
                        <Ionicons name="shirt-outline" size={18} color={currentTheme.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.hainaText}>{`Haina ${idx + 1}: ${haina.material}, ${haina.culoare}, ${haina.temperatura}`}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.dateText}>{item.created_at && item.created_at.seconds ? new Date(item.created_at.seconds * 1000).toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</Text>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e6f7f9' }]} onPress={() => handleReuse(item)}>
                      <Ionicons name="refresh" size={20} color={currentTheme.primary} />
                      <Text style={[styles.actionText, { color: currentTheme.primary }]}>Reutilizează</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ffeaea' }]} onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash" size={20} color="#e63946" />
                      <Text style={[styles.actionText, { color: '#e63946' }]}>Șterge</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#F7FAFC',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 6,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  programBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  programBadge: {
    backgroundColor: '#e6f7f9',
    color: '#207278',
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 2,
    marginTop: 2,
    marginRight: 8,
    shadowColor: '#207278',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  hainaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  hainaText: {
    fontSize: 15,
    color: '#2D3748',
  },
});

// to do