import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getFirebaseAuth, db } from '@/firebaseConfig';
import { getLaundryTip } from '@/src/utils/chat';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { HistoryService } from '@/src/services/historyService';
import { useHistory } from '@/hooks/useHistory';

const materialMap = {
  'Bumbac': 'Cotton',
  'Lână': 'Wool',
  'Sintetic': 'Synthetic',
  'Delicat': 'Delicate',
  'Mătase': 'Silk',
  'Vâscoză': 'Viscose',
  'Poliester': 'Polyester',
  'Bumbac organic': 'Organic cotton',
  'In': 'Linen',
  'Cașmir': 'Cashmere'
};

const colorMap = {
  'Alb': 'White',
  'Negru': 'Black',
  'Colorat': 'Colored',
  'Multicolor': 'Multicolor',
  'Pastel': 'Pastel',
  'Roșu': 'Red',
  'Albastru': 'Blue'
};

// home page - display the last scanned clothes, tip of the day and other useful information
export default function Home() {
  const [clothes, setClothes] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [tip, setTip] = useState('');
  const [lastSession, setLastSession] = useState<any | null>(null);
  const [stats, setStats] = useState<{ sessions: number; clothes: number }>({ sessions: 0, clothes: 0 });
  const auth = getFirebaseAuth();
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { t, i18n: i18nInstance } = useTranslation();
  const { getPinnedSessions, pinnedSessions, unpinSession } = useHistory();

  // display the current user s first name
  useEffect(() => {
    const fetchDisplayName = async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        console.log('DisplayName:', user.displayName);
        const fullName = user.displayName || '';
        const firstName = fullName.trim().split(' ')[0]; // display only the first name
        setDisplayName(firstName);
      }
    };
    fetchDisplayName();
  }, []);

  // fetch a response from the chat api
  useEffect(() => {
    const currentLanguage = i18nInstance.language;
    const message = currentLanguage === 'ro' 
      ? "Dă-mi un sfat scurt și util despre spălat. Nu folosi caracterele '**'"
      : "Give me a short and useful laundry tip. Stop using '**' characters";
    
    getLaundryTip(message, currentLanguage).then((response) => {
      setTip(response);
    });
  }, [i18nInstance.language]);

  useEffect(() => {
    const fetchStatsAndLastSession = async () => {
      const user = auth.currentUser;
      if (!user) return;
      // Obține statistici reale
      try {
        const statsData = await HistoryService.getStats(user.uid);
        setStats(statsData);
      } catch (e) {
        setStats({ sessions: 0, clothes: 0 });
      }
      // Poți păstra logica pentru lastSession dacă vrei
    };
    fetchStatsAndLastSession();
  }, [auth.currentUser]);

  const reuseSession = (session: any) => {
    Alert.alert('Reutilizare', 'Funcționalitatea de reutilizare poate fi personalizată.');
  };

  const goToScan = () => {
    router.push({ pathname: '/(tabs)/scan', params: { openCamera: 'true' } });
  };

  // fetch the last scanned clothes from the database
  const renderItem = ({}) => {
    // render logic for each clothing item will go here
    return null;
  };

  // În Home, folosește date mock pentru ultima recomandare
  const mockLastSession = {
    program: 'Colored Cotton 40°C, 800 rpm, color detergent',
    items: [
      { id: '1', material: 'Cotton', culoare: 'Blue', temperatura: '40°C' },
      { id: '2', material: 'Cotton', culoare: 'Red', temperatura: '40°C' },
    ],
    created_at: { seconds: Math.floor(Date.now() / 1000) },
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: currentTheme.textSecondary } ]}>{t('home.welcome')},</Text>
          <Text style={[styles.title, styles.userName, { color: currentTheme.primary }]}>{displayName || t('home.user')}</Text>
        </View>
        <TouchableOpacity style={styles.cameraButton} onPress={goToScan}> 
          <Ionicons name="camera-outline" size={24} color={currentTheme.buttonText}/>
        </TouchableOpacity>
      </View>

      {/* Sfatul zilei */}
      {tip ? (
        <View style={[styles.tipCard, { backgroundColor: isDark ? currentTheme.card : '#e6f7f9', borderColor: isDark ? currentTheme.border : 'rgba(32, 114, 120, 0.2)' }] }>
          <View style={[styles.tipHeader, { backgroundColor: isDark ? currentTheme.background : 'rgba(32, 114, 120, 0.1)' }] }>
            <Ionicons name="bulb-outline" size={24} color={currentTheme.primary} style={styles.tipIcon} />
            <Text style={[styles.tipTitle, { color: currentTheme.primary }]}>{t('home.tipOfTheDay')}</Text>
          </View>
          <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>{tip}</Text>
        </View>
      ) : null}

      {/* Container pentru statistici + scanare rapida */}
      <View style={[styles.statsCard, styles.cardUnified, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }] }>
        <Text style={[styles.statsTitle, styles.cardTitle, { color: currentTheme.primary, textAlign: 'left' }]}>{t('home.personalStats')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="calendar-outline" size={28} color="#5bafb5" style={{ marginBottom: 2 }} />
            <Text style={styles.statNumber}>{stats.sessions}</Text>
            <Text style={styles.statLabel}>{t('home.sessions')}</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="shirt-outline" size={28} color="#5bafb5" style={{ marginBottom: 2 }} />
            <Text style={styles.statNumber}>{stats.clothes}</Text>
            <Text style={styles.statLabel}>{t('home.clothesScanned')}</Text>
          </View>
        </View>
      </View>

      {/* Programe favorite (mini board) */}
      <View style={[styles.lastRecCard, styles.cardUnified, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }] }>
        <Text style={[styles.sectionTitle, styles.cardTitle, { color: currentTheme.primary, textAlign: 'left' }]}>Programe favorite</Text>
        {pinnedSessions.length === 0 ? (
          <Text style={{ color: currentTheme.textSecondary, fontStyle: 'italic', marginBottom: 8 }}>
            Niciun program favorit salvat încă. Poți salva un program din istoric pentru a-l vedea aici.
          </Text>
        ) : (
          <View style={{ maxHeight: 220 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
              {pinnedSessions.map(session => (
                <View key={session.id} style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: currentTheme.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: currentTheme.border }}>
                  <TouchableOpacity onPress={() => unpinSession(session.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="star" size={22} color={currentTheme.primary} style={{ marginRight: 10 }} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: currentTheme.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                      {session.washGroup.washingProfile.program}
                    </Text>
                    <Text style={{ color: currentTheme.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {session.washGroup.washingProfile.temperature}, {session.washGroup.washingProfile.washTime} min, {session.washGroup.washingProfile.spinSpeed} rpm
                    </Text>
                    <Text style={{ color: currentTheme.textSecondary, marginTop: 2, fontSize: 12 }}>
                      {session.created_at.toLocaleDateString(i18nInstance.language === 'ro' ? 'ro-RO' : 'en-US', { dateStyle: 'medium' })}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
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
    marginBottom: 30,
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
  lastRecCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 30,
    marginTop: -13,
    shadowColor: '#207278',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(32, 114, 120, 0.12)',
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
    marginBottom: 8,
    marginTop: 2,
  },
  hainaText: {
    fontSize: 15,
    color: '#2D3748',
    marginBottom: 2,
  },
  reuseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7f9',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  reuseBtnText: {
    color: '#207278',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 7,
  },
  statsCard: {
    backgroundColor: '#f7fafc',
    borderRadius: 16,
    padding: 18,
    marginTop: -20,
    marginBottom: 30,
    shadowColor: '#207278',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#207278',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5bafb5',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statsScanContainer: {
    marginTop: 10,
    marginBottom: 18,
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#5bafb5',
    borderRadius: 25,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  cardUnified: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#207278',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    fontFamily: 'Roboto',
    letterSpacing: 0.1,
  },
});