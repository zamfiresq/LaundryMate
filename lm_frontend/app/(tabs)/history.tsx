import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useHistory } from '@/hooks/useHistory';
import { HistorySession } from '@/src/services/types';
import { getTextualRecommendation } from '@/src/utils/laundryRules';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filteredSessions, setFilteredSessions] = useState<HistorySession[]>(sessions);

  useEffect(() => {
    const fetchPinned = async () => {
      if (sessions.length === 0) return;
      const pinned = await getPinnedSessions();
      setPinnedIds(pinned.map(s => s.id));
    };
    fetchPinned();
  }, [sessions, getPinnedSessions]);

  useEffect(() => {
    if (filterDate) {
      setFilteredSessions(
        sessions.filter(s =>
          s.created_at.toDateString() === filterDate.toDateString()
        )
      );
    } else {
      setFilteredSessions(sessions);
    }
  }, [filterDate, sessions]);

  const handlePin = async (id: string) => {
    await pinSession(id);
    setPinnedIds(prev => [...prev, id]);
  };
  const handleUnpin = async (id: string) => {
    await unpinSession(id);
    setPinnedIds(prev => prev.filter(pid => pid !== id));
  };

  const renderSessionDetailsModal = () => {
    if (!selectedSession) return null;
    // Conversie GarmentItem[] la ClothingItem[]
    const clothingItems = selectedSession.garments.map(g => ({
      id: g.id,
      image: g.image,
      material: g.material,
      culoare: g.culoare,
      temperatura: typeof g.temperatura === 'number' ? `${g.temperatura}°C` : g.temperatura,
      simboluri: g.simboluri,
      materialManual: g.materialManual,
      culoareManual: g.culoareManual
    }));
    const recommendationText = getTextualRecommendation([clothingItems]);
    const processedRecommendation = recommendationText.replace(
      /Grupul (\d+) \((\d+) articole\):/g, 
      (match, groupNumber, itemCount) => {
        const count = parseInt(itemCount);
        const articleWord = count === 1 ? 'articol' : 'articole';
        return `Grupul ${groupNumber} (${count} ${articleWord}):`;
      }
    );
    const groupBlocks = processedRecommendation.split(/(Grupul \d+ \(\d+ articole?\):)/g).filter(Boolean);
    return (
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay]}> 
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card, marginTop: 32, padding: 12, minWidth: '100%', marginBottom: 64 }]}> 
            <View style={styles.modalHeader}>
              <Text style={{ fontWeight: '700', fontSize: 22, color: currentTheme.text, flex: 1, textAlign: 'center' }}>Detalii sesiune</Text>
            </View>
            <ScrollView style={{ maxHeight: '92%' }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={true}>
              {groupBlocks.map((block, idx) => {
                if (block.startsWith('Grupul')) {
                  return (
                    <View key={idx} style={{ marginTop: idx !== 0 ? 20 : 0, marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700', fontSize: 18, color: currentTheme.primary, letterSpacing: 0.2 }}>{block}</Text>
                    </View>
                  );
                } else {

                  const lines = block.split('\n').filter(Boolean);
                  const articleLines = lines.filter(l => l.trim().startsWith('• Haina'));
                  const recIndex = lines.findIndex(l => l.trim().startsWith('Recomandare spălare:'));
                  const recLines = recIndex !== -1 ? lines.slice(recIndex) : [];
                  const tipsIndex = lines.findIndex(l => l.trim().startsWith('• Sfaturi speciale:'));
                  let specialTips: string[] = [];
                  if (tipsIndex !== -1) {
                    specialTips = lines.slice(tipsIndex + 1)
                      .filter(line => line.trim().startsWith('- '))
                      .map(line => line.trim().replace(/^- /, ''));
                  }
                  return (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: currentTheme.cardSecondary,
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 18,
                        shadowColor: '#000',
                        shadowOpacity: 0.06,
                        shadowRadius: 3,
                        elevation: 2,
                        borderWidth: 1,
                        borderColor: currentTheme.border,
                      }}
                    >
                      {/* lista articole */}
                      <View style={{ marginBottom: 16 }}>
                        {articleLines.map((art, i) => {
                          const cleanText = art.replace(/^•\s*/, ''); 
                          const itemName = cleanText.split(':')[0].trim();
                          const match = art.match(/: (.*?), (.*?),/);
                          const material = match ? match[1] : '';
                          const culoare = match ? match[2] : '';
                          return (
                            <View key={i} style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              marginBottom: 10,
                              paddingVertical: 8,
                            }}>
                              <Text style={{ 
                                fontSize: 16, 
                                color: currentTheme.primary, 
                                fontWeight: '600',
                                flex: 1,
                                marginRight: 12,
                              }}>
                                {`Haina ${i + 1}`}
                              </Text>
                              {material && (
                                <View style={{ 
                                  backgroundColor: '#e3f2fd',
                                  borderRadius: 12,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  marginRight: 8,
                                  borderWidth: 1,
                                  borderColor: '#bbdefb',
                                }}>
                                  <Text style={{ 
                                    fontSize: 12, 
                                    color: '#1565c0', 
                                    fontWeight: '600',
                                    textTransform: 'capitalize'
                                  }}>
                                    {material.toLowerCase()}
                                  </Text>
                                </View>
                              )}
                              {culoare && (
                                <View style={{ 
                                  backgroundColor: '#fff3e0',
                                  borderRadius: 12,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  borderWidth: 1,
                                  borderColor: '#ffcc80',
                                }}>
                                  <Text style={{ 
                                    fontSize: 12, 
                                    color: '#e65100', 
                                    fontWeight: '600',
                                    textTransform: 'capitalize'
                                  }}>
                                    {culoare.toLowerCase()}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                      {/* recomandare */}
                      <View style={{ borderTopWidth: 1, borderTopColor: currentTheme.border, paddingTop: 10, marginBottom: 8 }}>
                        <Text style={{ fontWeight: '700', color: currentTheme.text, fontSize: 16, marginBottom: 10 }}>
                          Recomandare spălare:
                        </Text>
                        {recLines.map((rec, i) => {
                          if (i === 0 || rec.trim().startsWith('• Sfaturi speciale:') || rec.trim().startsWith('- ')) {
                            return null;
                          }
                          const [label, ...rest] = rec.split(':');
                          const value = rest.join(':').trim();
                          let icon = null;
                          let badgeColor = '#e0f7fa';
                          let badgeTextColor = '#207278';
                          if (label.startsWith('Program')) {
                            icon = <Ionicons name="shirt-outline" size={16} color={currentTheme.primary} style={{ marginRight: 4 }} />;
                            badgeColor = '#e0f7fa'; badgeTextColor = '#207278';
                          }
                          if (label.startsWith('Temperatură')) {
                            icon = <Ionicons name="thermometer-outline" size={16} color="#e57373" style={{ marginRight: 4 }} />;
                            badgeColor = '#ffe0b2'; badgeTextColor = '#b26a00';
                          }
                          if (label.startsWith('Viteză centrifugare')) {
                            icon = <Ionicons name="sync-outline" size={16} color="#64b5f6" style={{ marginRight: 4 }} />;
                            badgeColor = '#bbdefb'; badgeTextColor = '#1976d2';
                          }
                          if (label.startsWith('Timp spălare')) {
                            icon = <Ionicons name="time-outline" size={16} color="#81c784" style={{ marginRight: 4 }} />;
                            badgeColor = '#c8e6c9'; badgeTextColor = '#388e3c';
                          }
                          if (label.startsWith('Detergent')) {
                            icon = <Ionicons name="flask-outline" size={16} color="#ffd54f" style={{ marginRight: 4 }} />;
                            badgeColor = '#fff9c4'; badgeTextColor = '#fbc02d';
                          }
                          return (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              {icon}
                              <Text style={{ fontWeight: '600', color: currentTheme.text, minWidth: 110 }}>{label}:</Text>
                              <View style={{ backgroundColor: badgeColor, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 1, marginLeft: 4, flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 13, color: badgeTextColor, fontWeight: '600' }}>{value}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                      {/* sectiune separata pt sfaturi speciale */}
                      {specialTips.length > 0 && (
                        <View style={{ 
                          borderTopWidth: 1, 
                          borderTopColor: currentTheme.border, 
                          paddingTop: 12, 
                          marginTop: 8 
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons name="bulb-outline" size={16} color="#ffa726" style={{ marginRight: 6 }} />
                            <Text style={{ 
                              fontWeight: '700', 
                              color: currentTheme.text, 
                              fontSize: 15 
                            }}>
                              Sfaturi speciale:
                            </Text>
                          </View>
                          {specialTips.map((tip, tipIndex) => (
                            <Text 
                              key={tipIndex} 
                              style={{ 
                                fontSize: 14, 
                                color: currentTheme.text, 
                                lineHeight: 20,
                                marginBottom: 6,
                                paddingLeft: 4,
                                fontStyle: 'italic'
                              }}
                            >
                              • {tip}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                }
              })}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: currentTheme.cardSecondary, borderWidth: 1, borderColor: currentTheme.border, marginTop: 12 }]} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: currentTheme.text }]}>Închide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSessionItem = ({ item }: { item: HistorySession }) => {
    const { washGroup, garments } = item;
    const isPinned = pinnedIds.includes(item.id);
    
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => { setSelectedSession(item); setModalVisible(true); }}>
      <View style={[
        styles.card,
        { 
          backgroundColor: currentTheme.card,
          borderColor: currentTheme.border,
          shadowColor: currentTheme.primary
        }
      ]}>
        <View style={styles.cardHeader}>
          {/* badge pentru program */}
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
          </View>
        </View>

        {/* actiuni */}
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
      </TouchableOpacity>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <TouchableOpacity
          style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: currentTheme.primary, marginRight: 8 }}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={22} color={currentTheme.primary} />
        </TouchableOpacity>
        {filterDate && (
          <TouchableOpacity
            style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: currentTheme.primary }}
            onPress={() => setFilterDate(null)}
          >
            <Ionicons name="close-circle-outline" size={22} color={currentTheme.primary} />
          </TouchableOpacity>
        )}
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={filterDate || new Date()}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            setShowDatePicker(false);
            if (date) setFilterDate(date);
          }}
        />
      )}
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
          data={filteredSessions}
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
      {renderSessionDetailsModal()}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});