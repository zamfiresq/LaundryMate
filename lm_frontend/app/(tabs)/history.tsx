import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useHistory } from '@/hooks/useHistory';
import { HistorySession } from '@/src/services/types';

export default function HistoryScreen() {
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { t } = useTranslation();
  
  const {
    sessions,
    loading,
    refreshing,
    error,
    refreshSessions,
    deleteSession,
    reuseSession,
    isEmpty,
    clearAllSessions,
    pinSession,
    unpinSession,
    getPinnedSessions
  } = useHistory();

  // State pentru id-urile sesiunilor pin-uite
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchPinned = async () => {
      if (sessions.length === 0) return;
      const pinned = await getPinnedSessions();
      setPinnedIds(pinned.map(s => s.id));
    };
    fetchPinned();
  }, [sessions, getPinnedSessions]);

  const handlePin = async (id: string) => {
    await pinSession(id);
    setPinnedIds(prev => [...prev, id]);
  };
  const handleUnpin = async (id: string) => {
    await unpinSession(id);
    setPinnedIds(prev => prev.filter(pid => pid !== id));
  };

  console.log('=== HISTORY DEBUG ===');
  console.log('Sessions length:', sessions.length);
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('isEmpty:', isEmpty);
  console.log('Sessions data:', JSON.stringify(sessions, null, 2));

  const renderSessionItem = ({ item }: { item: HistorySession }) => {
    const { washGroup, garments } = item;
    const isPinned = pinnedIds.includes(item.id);
    
    return (
      <View style={[
        styles.card,
        { 
          backgroundColor: currentTheme.card,
          borderColor: currentTheme.border,
          shadowColor: currentTheme.primary
        }
      ]}>
        <View style={styles.cardHeader}>
          {/* Badge pentru program */}
          <View style={styles.programBadgeRow}>
            <Text style={[styles.programBadge, { 
              backgroundColor: currentTheme.primary + '20',
              color: currentTheme.primary 
            }]}>
              {washGroup.washingProfile.program}
            </Text>
            
            {washGroup.totalGroups > 1 && (
              <Text style={[styles.groupIndicator, { color: currentTheme.textSecondary }]}>
                Grup {washGroup.groupIndex}/{washGroup.totalGroups}
              </Text>
            )}
            
            {/* Buton Pin/Unpin */}
            <TouchableOpacity
              style={{ marginLeft: 8 }}
              onPress={() => isPinned ? handleUnpin(item.id) : handlePin(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={isPinned ? 'star' : 'star-outline'} size={22} color={isPinned ? currentTheme.primary : currentTheme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* data si ora */}
          <Text style={[styles.dateText, { color: currentTheme.textSecondary }]}>
            {item.created_at.toLocaleString('ro-RO', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        <View style={styles.cardContent}>
          {/* imaginea primei haine */}
          {garments[0]?.image && (
            <Image 
              source={{ uri: garments[0].image }} 
              style={styles.garmentImage}
            />
          )}
          
          <View style={styles.sessionInfo}>
            {/* detalii despre program */}
            <View style={styles.programDetails}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="thermometer-outline" size={18} color={currentTheme.primary} style={{ marginRight: 4, marginBottom: 4 }} />
                <Text style={[styles.programDetailText, { color: currentTheme.text, marginRight: 12 }]}>
                  {washGroup.washingProfile.temperature}
                </Text>
                <Ionicons name="time-outline" size={18} color={currentTheme.primary} style={{ marginRight: 4, marginBottom: 4 }} />
                <Text style={[styles.programDetailText, { color: currentTheme.text, marginRight: 12 }]}>
                  {washGroup.washingProfile.washTime}
                </Text>
                <Ionicons name="sync-outline" size={18} color={currentTheme.primary} style={{ marginRight: 4, marginBottom: 4}} />
                <Text style={[styles.programDetailText, { color: currentTheme.text }]}>
                  {washGroup.washingProfile.spinSpeed} rpm
                </Text>
              </View>
              <Text style={[styles.detergentText, { color: currentTheme.textSecondary }]}>
                Detergent: {washGroup.washingProfile.detergentType}
              </Text>
            </View>
            
            {/* Lista hainelor */}
            <View style={styles.garmentsList}>
              {garments.map((garment, index) => (
                <View key={garment.id} style={styles.garmentRow}>
                  <Ionicons 
                    name="shirt-outline" 
                    size={16} 
                    color={currentTheme.primary}
                    style={styles.garmentIcon}
                  />
                  <Text style={[styles.garmentText, { color: currentTheme.text }]}>
                    {garment.material} {garment.culoare} ({garment.temperatura}°C)
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Eficiența (dacă există) */}
            {washGroup.efficiency && (
              <View style={styles.efficiencyBadge}>
                <Text style={[styles.efficiencyText, { color: currentTheme.primary }]}>
                  Eficiență: {Math.round(washGroup.efficiency)}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Acțiuni */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => deleteSession(item.id)}
          >
            <Ionicons name="trash" size={18} color="#e63946" />
            <Text style={[styles.actionText, { color: '#e63946' }]}>
              Șterge
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Header pentru FlatList
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTextContainer}>
        <Text style={[styles.title, { color: currentTheme.text }]}> 
          {t('history.title')}
        </Text>
        {sessions.length > 0 && (
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}> 
            {sessions.length} {sessions.length === 1 ? 'sesiune' : 'sesiuni'}
          </Text>
        )}
      </View>
      {sessions.length > 0 && (
        <TouchableOpacity
          style={styles.clearAllIconBtn}
          onPress={clearAllSessions}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={26} color={currentTheme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && sessions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>
          Se încarcă istoricul...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: currentTheme.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={currentTheme.textSecondary} />
        <Text style={[styles.errorText, { color: currentTheme.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[styles.retryBtn, { backgroundColor: currentTheme.primary }]}
          onPress={refreshSessions}
        >
          <Text style={styles.retryBtnText}>Încearcă din nou</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Lista de sesiuni */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color={currentTheme.textSecondary} />
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
            {t('history.description')}
          </Text>
          <Text style={[styles.emptySubtext, { color: currentTheme.textSecondary }]}>
            Scanează prima ta haină pentru a începe!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={refreshSessions}
              colors={[currentTheme.primary]}
              tintColor={currentTheme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={<View style={{ height: 80 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 12,
  },
  programBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  programBadge: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  groupIndicator: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  garmentImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  sessionInfo: {
    flex: 1,
  },
  programDetails: {
    marginBottom: 8,
  },
  programDetailText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  detergentText: {
    fontSize: 13,
  },
  garmentsList: {
    marginBottom: 8,
  },
  garmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  garmentIcon: {
    marginRight: 8,
  },
  garmentText: {
    fontSize: 14,
    flex: 1,
  },
  efficiencyBadge: {
    alignSelf: 'flex-start',
  },
  efficiencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#ffebee',
    marginLeft: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearAllIconBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 6,
    zIndex: 10,
  },
});