import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Alert, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import { Picker } from '@react-native-picker/picker';
import { groupCompatibleItems, getMaterialCategory, getColorGroup, getTemperatureCategory } from '@/src/utils/laundryRules';
import { getFirebaseAuth, db } from '@/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ClothingItem {
  id: string;
  image: string;
  material: string;
  culoare: string;
  temperatura: string;
  simboluri: string[];
  materialManual?: string;
  culoareManual?: string;
}

const getDetailsFromSymbols = (symbols: string[]) => {
  let temperatura = 'N/A';
  let material = 'N/A';
  let culoare = 'N/A';

  const normalize = (s: string | undefined) =>
    s ? s.toLowerCase().replace(/[\s_]/g, '').trim() : '';

  const norm = symbols.filter(Boolean).map(normalize);

  const temperatureMap: Record<string, string> = {
    '30c': '30°C',
    '40c': '40°C',
    '50c': '50°C',
    '60c': '60°C',
    '90c': '90°C',
  };

  const materialMap: Record<string, string> = {
    'handwash': 'delicate',
    'donotdryclean': 'sintetic',
    'dryclean': 'bumbac',
  };

  const colorMap: Record<string, string> = {
    'donotbleach': 'colorat',
    'bleach': 'alb',
  };

  for (const key in temperatureMap) {
    if (norm.includes(key)) {
      temperatura = temperatureMap[key];
      break;
    }
  }

  for (const key in materialMap) {
    if (norm.includes(key)) {
      material = materialMap[key];
      break;
    }
  }

  for (const key in colorMap) {
    if (norm.includes(key)) {
      culoare = colorMap[key];
      break;
    }
  }

  console.log('Details parsed ->', { temperatura, material, culoare });

  return { temperatura, material, culoare };
};



export default function ScanScreen() {
  const [laundryItems, setLaundryItems] = useState<ClothingItem[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { t } = useTranslation();
  const [expoPushToken, setExpoPushToken] = useState('');
  // Modal selection state
  const [selectedMaterialItem, setSelectedMaterialItem] = useState<ClothingItem | null>(null);
  const [selectedColorItem, setSelectedColorItem] = useState<ClothingItem | null>(null);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [manualRecommendation, setManualRecommendation] = useState<string>('');
  const { openCamera } = useLocalSearchParams();

  const auth = getFirebaseAuth();

  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission not granted for notifications!');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      setExpoPushToken(tokenData.data);
    };

    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    console.log('openCamera param:', openCamera);
    if (openCamera === 'true') {
      console.log('Calling handleTakePhoto...');
      handleTakePhoto();
    }
  }, [openCamera]);

  

  const analyzeClothingImage = async (imageUri: string): Promise<ClothingItem | null> => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch('http://192.168.100.113:8000/api/detect-symbols/', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) throw new Error('YOLOv8 prediction failed');

      const data = await response.json(); // array of detections
      console.log('YOLOv8 Response:', data); // log pentru debugging

      const predictionsArray = Array.isArray(data.predictions)
        ? data.predictions
        : (Array.isArray(data?.predictions?.predictions) ? data.predictions.predictions : []);
      console.log('Predictions array:', predictionsArray);
      
      const detectedSymbols: string[] = Array.from(new Set(predictionsArray.map((item: any) => item.label).filter(Boolean)));
      console.log('Detected symbol names:', detectedSymbols); 

      const { temperatura, material, culoare } = getDetailsFromSymbols(detectedSymbols);

      return {
        id: Date.now().toString(),
        image: imageUri,
        material,
        culoare,
        temperatura,
        simboluri: detectedSymbols,
        materialManual: material,
        culoareManual: culoare,
      };
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('scan.scanError'));
      return null;
    }
  };

  const handleUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      for (const asset of result.assets) {
        const imageUri = asset.uri;
        const item = await analyzeClothingImage(imageUri);
        if (item) {
          setLaundryItems(prev => [...prev, item]);
        }
      }
    }
  };

  const handleTakePhoto = async () => {
    console.log('handleTakePhoto called.');
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('common.error'), t('errors.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const item = await analyzeClothingImage(imageUri);
      if (item) {
        setLaundryItems(prev => [...prev, item]);
      }
    }
  };

  const handleDone = () => {
    Alert.alert(t('scan.title'), t('scan.scanComplete', { count: laundryItems.length }));
    console.log('Items:', laundryItems);
  };

  const getGroupRecommendation = (group: any[]): string => {
    // exemplu simplu de recomandare pe grup
    const material = getMaterialCategory(group[0].materialManual || group[0].material || '');
    const color = getColorGroup(group[0].culoareManual || group[0].culoare || '');
    const temp = group[0].temperatura || getTemperatureCategory(group[0].simboluri || []);
    let program = '';
    if (material === 'cotton' && color === 'white' && temp === '60C') {
      program = 'Bumbac alb 60°C, 1000 rpm, detergent pentru alb';
    } else if (material === 'cotton' && color !== 'white' && temp === '40C') {
      program = 'Bumbac colorat 40°C, 800 rpm, detergent color';
    } else if (material === 'synthetic') {
      program = 'Sintetice 40°C, 800 rpm, detergent universal';
    } else if (material === 'delicate') {
      program = 'Delicate 30°C, 600 rpm, detergent delicat';
    } else if (material === 'wool') {
      program = 'Lână 30°C, 600 rpm, program lână';
    } else {
      program = 'Program mixt 40°C, 800 rpm, detergent universal';
    }
    return program;
  };

  const renderRecommendationModal = () => {
    const lines = manualRecommendation.split('\n').filter(Boolean);
    let currentGroup = 0;
    return (
      <View>
        {lines.map((line, idx) => {
          if (line.startsWith('Grupul')) {
            currentGroup++;
            return (
              <View key={idx} style={{ marginBottom: 16, marginTop: idx !== 0 ? 12 : 0 }}>
                <Text style={{ fontWeight: '700', fontSize: 17, color: currentTheme.primary }}>{line}</Text>
              </View>
            );
          }
          if (line.startsWith('Recomandare:')) {
            return (
              <Text key={idx} style={{ color: '#207278', fontWeight: '600', marginBottom: 8, fontSize: 15 }}>{line}</Text>
            );
          }
          return (
            <Text key={idx} style={{ marginLeft: 10, fontSize: 15, color: currentTheme.text }}>{line}</Text>
          );
        })}
      </View>
    );
  };

  const saveToHistory = async (groups: any[][]) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      for (const group of groups) {
        await addDoc(collection(db, 'users', user.uid, 'garments'), {
          items: group.map((item: any) => ({
            id: item.id,
            material: item.materialManual || item.material,
            culoare: item.culoareManual || item.culoare,
            temperatura: item.temperatura,
            simboluri: item.simboluri,
            image: item.image,
          })),
          program: getGroupRecommendation(group),
          created_at: serverTimestamp(),
        });
      }
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-a putut salva în istoric.');
    }
  };

  const handleManualRecommendation = async () => {
    const groups: any[][] = groupCompatibleItems(laundryItems);
    if (groups.length === 0) {
      setManualRecommendation('Nu există haine scanate.');
      setModalVisible(true);
      return;
    }
    let text = '';
    groups.forEach((group: any[], idx: number) => {
      text += `Grupul ${idx + 1} (${group.length} articole):\n`;
      text += group.map((item: any) => {
        const itemIndex = laundryItems.findIndex((h) => h.id === item.id);
        return `Haina ${itemIndex + 1}: ${item.materialManual || item.material}, ${item.culoareManual || item.culoare}, ${item.temperatura}`;
      }).join('\n');
      text += `\nRecomandare: ${getGroupRecommendation(group)}\n\n`;
    });
    setManualRecommendation(text.trim());
    setModalVisible(true);
    await saveToHistory(groups);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }] }>
      <View style={[styles.header, { backgroundColor: currentTheme.background }] }>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>{t('scan.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.contentContainer, { backgroundColor: currentTheme.background }] }>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: currentTheme.primary }]} onPress={handleUploadImage}>
            <Ionicons name="images-outline" size={24} color={currentTheme.buttonText} />
            <Text style={[styles.actionButtonText, { color: currentTheme.buttonText }]}>{t('scan.gallery')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: currentTheme.primary }]} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={24} color={currentTheme.buttonText} />
            <Text style={[styles.actionButtonText, { color: currentTheme.buttonText }]}>{t('scan.camera')}</Text>
          </TouchableOpacity>
        </View>


        <View style={[styles.itemsContainer, { backgroundColor: currentTheme.card }] }>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('scan.scannedClothes')}</Text>
          
          {laundryItems.length === 0 ? (
            <View style={styles.placeholder}>
              <View style={styles.iconContainer}>
                <Ionicons name="scan-outline" size={55} color={currentTheme.primary} />
              </View>
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>{t('scan.noClothesScanned')}</Text>
            </View>
          ) : (
            <FlatList
              data={laundryItems}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <View style={[styles.itemCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }] }>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemNumber}>{`Haina ${index + 1}`}</Text>
                    <TouchableOpacity 
                      style={[
                        styles.inlineSelectBox,
                        { borderColor: currentTheme.primary, backgroundColor: currentTheme.cardSecondary },
                      ]}
                      onPress={() => { setSelectedMaterialItem(item); setMaterialModalVisible(true); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.inlineSelectText, { color: currentTheme.text }]}>
                        Material: {item.materialManual || 'Selectează'}
                      </Text>
                      <Ionicons name="pencil-outline" size={18} color={currentTheme.primary} style={styles.inlineSelectIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[
                        styles.inlineSelectBox,
                        { borderColor: currentTheme.primary, backgroundColor: currentTheme.cardSecondary },
                      ]}
                      onPress={() => { setSelectedColorItem(item); setColorModalVisible(true); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.inlineSelectText, { color: currentTheme.text }]}>
                        Culoare: {item.culoareManual || 'Selectează'}
                      </Text>
                      <Ionicons name="pencil-outline" size={18} color={currentTheme.primary} style={styles.inlineSelectIcon} />
                    </TouchableOpacity>
                    <Text style={[styles.itemLabel, { color: currentTheme.text }]}>{t('scan.temperature')}: {item.temperatura || 'N/A'}</Text>
                    <Text style={[styles.itemLabel, { color: currentTheme.text }]}>{t('scan.symbols')}: {Array.isArray(item.simboluri) ? item.simboluri.join(', ') : 'N/A'}</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
        
        {laundryItems.length > 0 && (
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: currentTheme.primary }]} onPress={handleManualRecommendation}>
            <Text style={[styles.doneButtonText, { color: currentTheme.buttonText }]}>{t('scan.finishScanning')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card }] }>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Recomandare spălare</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={currentTheme.primary} />
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 16 }}>{renderRecommendationModal()}</View>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.primary }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalButtonText, { color: currentTheme.buttonText }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Material */}
      <Modal visible={materialModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Selectează materialul</Text>
            {[
              'Bumbac',
              'Lână',
              'Sintetic',
              'Delicat',
              'Mătase',
              'Vâscoză',
              'Poliester',
              'Bumbac organic',
              'In',
              'Cașmir'
            ].map((mat) => (
              <TouchableOpacity
                key={mat}
                style={[
                  styles.modalOption,
                  { backgroundColor: currentTheme.cardSecondary },
                  selectedMaterialItem?.materialManual === mat && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setLaundryItems(prev =>
                    prev.map(clothing =>
                      clothing.id === selectedMaterialItem?.id ? { ...clothing, materialManual: mat } : clothing
                    )
                  );
                  setMaterialModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.modalOptionText,
                    { color: currentTheme.text },
                    selectedMaterialItem?.materialManual === mat && styles.modalOptionSelectedText
                  ]}
                >
                  {mat}
                </Text>
                {selectedMaterialItem?.materialManual === mat && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={currentTheme.primary} 
                    style={styles.modalOptionIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.modalCancelButton, { backgroundColor: currentTheme.cardSecondary }]} 
              onPress={() => setMaterialModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: currentTheme.text }]}>Anulează</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* modal culoare */}
      <Modal visible={colorModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Selectează culoarea</Text>
            {[
              'Alb',
              'Negru',
              'Colorat',
              'Multicolor',
              'Pastel'
            ].map((cul) => (
              <TouchableOpacity
                key={cul}
                style={[
                  styles.modalOption,
                  { backgroundColor: currentTheme.cardSecondary },
                  selectedColorItem?.culoareManual === cul && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setLaundryItems(prev =>
                    prev.map(clothing =>
                      clothing.id === selectedColorItem?.id ? { ...clothing, culoareManual: cul } : clothing
                    )
                  );
                  setColorModalVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.modalOptionText,
                    { color: currentTheme.text },
                    selectedColorItem?.culoareManual === cul && styles.modalOptionSelectedText
                  ]}
                >
                  {cul}
                </Text>
                {selectedColorItem?.culoareManual === cul && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={currentTheme.primary} 
                    style={styles.modalOptionIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.modalCancelButton, { backgroundColor: currentTheme.cardSecondary }]} 
              onPress={() => setColorModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: currentTheme.text }]}>Anulează</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}












// styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'left',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#5bafb5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  itemsContainer: {
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
  listContainer: {
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  itemDetails: {
    padding: 20,
  },
  itemLabel: {
    fontSize: 15,
    color: '#4A5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#5bafb5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#5bafb5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  modalOptionSelected: {
    backgroundColor: '#EBF8FA',
    borderColor: '#5bafb5',
  },
  modalOptionSelectedText: {
    color: '#5bafb5',
    fontWeight: '600',
  },
  modalOptionIcon: {
    marginLeft: 8,
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EDF2F7',
  },
  modalCancelText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inlineSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 8,
    marginRight: 8,
  },
  inlineSelectText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  inlineSelectIcon: {
    marginLeft: 6,
  },
  itemNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5bafb5',
    marginBottom: 4,
  },
});
