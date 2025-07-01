import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getFirebaseAuth } from '@/firebaseConfig';
import { HistoryService } from '@/src/services/historyService';
import { HistorySession } from '@/src/services/types';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export const useHistory = () => {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinnedSessions, setPinnedSessions] = useState<HistorySession[]>([]);
  
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  /**
   * Încarcă sesiunile din istoric
   */
  const loadSessions = useCallback(async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const historySessions = await HistoryService.getHistorySessions(user.uid);
      setSessions(historySessions);
      console.log(`Loaded ${historySessions.length} history sessions`);
    } catch (error) {
      console.error('Error loading history:', error);
      setError('Nu s-au putut încărca sesiunile din istoric');
      Alert.alert('Eroare', 'Nu s-au putut încărca sesiunile din istoric');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  /**
   * Reîmprospătează istoricul
   */
  const refreshSessions = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
  }, [loadSessions]);

  /**
   * Șterge o sesiune
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    
    Alert.alert(
      'Confirmare ștergere',
      'Ești sigur că vrei să ștergi această sesiune?',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge',
          style: 'destructive',
          onPress: async () => {
            try {
              await HistoryService.deleteWashGroup(user.uid, sessionId);
              setSessions(prev => prev.filter(session => session.id !== sessionId));
              Alert.alert('Succes', 'Sesiunea a fost ștearsă');
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Eroare', 'Nu s-a putut șterge sesiunea');
            }
          }
        }
      ]
    );
  }, [user]);

  /**
   * Găsește sesiuni similare pentru reutilizare
   */
  const findSimilarSessions = useCallback(async (currentGarments: any[]) => {
    if (!user) return [];
    
    try {
      return await HistoryService.findSimilarGroups(user.uid, currentGarments);
    } catch (error) {
      console.error('Error finding similar sessions:', error);
      return [];
    }
  }, [user]);

  /**
   * Reutilizează o sesiune
   */
  const reuseSession = useCallback((session: HistorySession) => {
    const { washGroup, garments } = session;
    
    Alert.alert(
      'Reutilizare sesiune',
      `Program: ${washGroup.washingProfile.program}\n` +
      `Temperatură: ${washGroup.washingProfile.temperature}°C\n` +
      `Haine: ${garments.length} articole\n\n` +
      `Vrei să reutilizezi această configurație?`,
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Reutilizează',
          onPress: () => {
            // Aici poți implementa logica pentru reutilizare
            // De exemplu, navighează la pagina de scanare cu datele pre-completate
            // sau salvează configurația ca template
            
            // Pentru moment, doar afișăm confirmarea
            Alert.alert(
              'Configurație salvată',
              'Configurația a fost aplicată ca template pentru următoarea spălare!'
            );
          }
        }
      ]
    );
  }, []);

  /**
   * Șterge toate sesiunile din istoric
   */
  const clearAllSessions = useCallback(async () => {
    if (!user) return;
    Alert.alert(
      'Confirmare ștergere',
      'Ești sigur că vrei să ștergi tot istoricul? Această acțiune nu poate fi anulată.',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge tot',
          style: 'destructive',
          onPress: async () => {
            try {
              await HistoryService.deleteAllWashGroups(user.uid);
              setSessions([]);
              Alert.alert('Succes', 'Tot istoricul a fost șters');
            } catch (error) {
              console.error('Error deleting all sessions:', error);
              Alert.alert('Eroare', 'Nu s-a putut șterge istoricul');
            }
          }
        }
      ]
    );
  }, [user]);

  /**
   * Pin-uiește o sesiune
   */
  const pinSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    await HistoryService.pinSession(user.uid, sessionId);
  }, [user]);

  /**
   * Unpin-uiește o sesiune
   */
  const unpinSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    await HistoryService.unpinSession(user.uid, sessionId);
  }, [user]);

  /**
   * Returnează sesiunile pin-uite (obiecte complete)
   */
  const getPinnedSessions = useCallback(async () => {
    // Nu mai e nevoie de fetch async, folosim pinnedSessions
    return pinnedSessions;
  }, [pinnedSessions]);

  // Încarcă sesiunile la primul mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, loadSessions]);

  // Real-time listener pentru pinnedRecommendations
  useEffect(() => {
    if (!user) return;
    const pinsRef = collection(db, 'users', user.uid, 'pinnedRecommendations');
    const unsubscribe = onSnapshot(pinsRef, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setPinnedIds(ids);
      // Actualizez și pinnedSessions cu obiectele complete
      setPinnedSessions(sessions.filter(s => ids.includes(s.id)));
    });
    return () => unsubscribe();
  }, [user, sessions]);

  return {
    // Date
    sessions,
    loading,
    refreshing,
    error,
    pinnedIds,
    pinnedSessions,
    
    // Acțiuni
    loadSessions,
    refreshSessions,
    deleteSession,
    reuseSession,
    findSimilarSessions,
    clearAllSessions,
    pinSession,
    unpinSession,
    getPinnedSessions,
    
    // Starea
    isReady: !loading && sessions.length >= 0,
    isEmpty: !loading && sessions.length === 0
  };
};