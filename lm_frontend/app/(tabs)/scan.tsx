import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Alert, TouchableOpacity, Modal, SafeAreaView, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import { Picker } from '@react-native-picker/picker';
import { getFirebaseAuth, db } from '@/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  groupCompatibleItems, 
  getMaterialCategory, 
  getColorGroup, 
  getTemperatureCategory,
  getTextualRecommendation,
  generateGroupRecommendation,
  type ClothingItem,
  type GroupingResult
} from '@/src/utils/laundryRules';


// extragerea detaliilor din simboluri
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

  // maparea simbolurilor la material si culoare
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

  return { temperatura, material, culoare };
};


// ecranul de scanare
export default function ScanScreen() {
  const [laundryItems, setLaundryItems] = useState<ClothingItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { t } = useTranslation();
  const [expoPushToken, setExpoPushToken] = useState('');
  
  // modal pt selectarea materialului si culorii
  const [selectedMaterialItem, setSelectedMaterialItem] = useState<ClothingItem | null>(null);
  const [selectedColorItem, setSelectedColorItem] = useState<ClothingItem | null>(null);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [manualRecommendation, setManualRecommendation] = useState<string>('');
  const { openCamera } = useLocalSearchParams();

  const auth = getFirebaseAuth();

  useEffect(() => {
    // permisiuni pt notificari
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

  // efect pt a deschide camera automat
  useEffect(() => {
    // console.log('openCamera param:', openCamera);
    if (openCamera === 'true') {
      // console.log('Calling handleTakePhoto...');
      handleTakePhoto();
    }
  }, [openCamera]);

 // functie pt trimiterea imaginilor catre backend pt analiza
  const analyzeClothingImage = async (imageUri: string): Promise<ClothingItem | null> => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);

      // trimitere catre backend pentru detectarea simbolurilor
      const response = await fetch('http://192.168.100.119:8000/api/detect-symbols/', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) throw new Error('YOLOv8 prediction failed');

      const data = await response.json();
      console.log('YOLOv8 Response:', data);

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
        nume: `Haina ${laundryItems.length + 1}`
      };
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('scan.scanError'));
      return null;
    }
  };

  // functie pentru incarcarea imaginilor din galerie
  const handleUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      for (const asset of result.assets) {
        const imageUri = asset.uri;
        const item = await analyzeClothingImage(imageUri);
        if (item) {
          setLaundryItems(prev => [
            ...prev,
            {
              ...item,
              nume: `Haina ${prev.length + 1}`
            }
          ]);
        }
      }
    }
  };

  // functie pt a face poza cu camera
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
        setLaundryItems(prev => [
          ...prev,
          {
            ...item,
            nume: `Haina ${prev.length + 1}`
          }
        ]);
      }
    }
  };

  // modal pentru selectarea materialului
  const getGroupRecommendation = (group: ClothingItem[]): string => {
    const profile = generateGroupRecommendation(group);
    
    let recommendation = `Program: ${profile.program}\n`;
    recommendation += `Temperatură: ${profile.temperature}\n`;
    recommendation += `Centrifugare: ${profile.spinSpeed} rpm\n`;
    recommendation += `Durată: ${profile.washTime} minute\n`;
    recommendation += `Detergent: ${profile.detergentType}`;
    
    return recommendation;
  };


  const renderRecommendationModal = () => {
  // procesare text pt a corecta singular/plural
  const processedRecommendation = manualRecommendation.replace(
    /Grupul (\d+) \((\d+) articole\):/g, 
    (match, groupNumber, itemCount) => {
      const count = parseInt(itemCount);
      const articleWord = count === 1 ? 'articol' : 'articole';
      return `Grupul ${groupNumber} (${count} ${articleWord}):`;
    }
  );

  const groupBlocks = processedRecommendation.split(/(Grupul \d+ \(\d+ articole?\):)/g).filter(Boolean);
  
  return (
    <ScrollView
      style={{ maxHeight: '92%' }}
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={true}
    >
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

          // parsarea sfaturilor speciale
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
                      {/* nume haina */}
                      <Text style={{ 
                        fontSize: 16, 
                        color: currentTheme.primary, 
                        fontWeight: '600',
                        flex: 1,
                        marginRight: 12,
                      }}>
                        {itemName}
                      </Text>

                      {/* badge material */}
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

                      {/* badge culoare */}
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
  );
};



  // // // Salvare în istoric fără restricții
  // // const saveToHistory = async (groups: ClothingItem[][]) => {
  // //   try {
  // //     const user = auth.currentUser;
  // //     if (!user) return;
      
  // //     for (let i = 0; i < groups.length; i++) {
  // //       const group = groups[i];
  // //       const profile = generateGroupRecommendation(group);
        
  // //       await addDoc(collection(db, 'users', user.uid, 'garments'), {
  // //         groupIndex: i + 1,
  // //         totalGroups: groups.length,
  // //         items: group.map((item: ClothingItem) => ({
  // //           id: item.id,
  // //           material: item.materialManual || item.material,
  // //           culoare: item.culoareManual || item.culoare,
  // //           temperatura: item.temperatura,
  // //           simboluri: item.simboluri,
  // //           image: item.image,
  // //         })),
  // //         washingProfile: {
  // //           program: profile.program,
  // //           temperature: profile.temperature,
  // //           spinSpeed: profile.spinSpeed,
  // //           washTime: profile.washTime,
  // //           detergentType: profile.detergentType,
  // //         },
  // //         recommendation: getGroupRecommendation(group),
  // //         created_at: serverTimestamp(),
  // //         efficiency: groupCompatibleItems(groups.flat()).efficiency
  // //       });
  // //     }
      
  //     console.log(`Salvate ${groups.length} grupuri în istoric`);
  //   } catch (e) {
  //     console.error('Eroare la salvarea în istoric:', e);
  //     Alert.alert('Eroare', 'Nu s-a putut salva în istoric.');
  //   }
  // };

  // salvare in istoric
  // await saveToHistory(result.groups);




// functie pentru recomandarea manuala 
  const handleManualRecommendation = async () => {
    const result: GroupingResult = groupCompatibleItems(laundryItems);
    
    if (result.groups.length === 0) {
      setManualRecommendation('Nu există haine scanate pentru grupare.');
      setModalVisible(true);
      return;
    }

    const textRecommendation = getTextualRecommendation(result.groups);
    let finalRecommendation = textRecommendation;
    
    setManualRecommendation(finalRecommendation);
    setModalVisible(true);

  };

  // functie de validare a gruparii inainte de finalizare
  const validateGrouping = (): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    let isValid = true;

    // verificare daca toate hainele au material si culoare setate
    const incompleteItems = laundryItems.filter(item => 
      !item.materialManual || !item.culoareManual
    );
    
    if (incompleteItems.length > 0) {
      warnings.push(`${incompleteItems.length} articole nu au materialul sau culoarea setate manual`);
    }

    // verific daca exista articole cu simboluri nedefinite
    const unknownSymbols = laundryItems.filter(item => 
      !item.simboluri || item.simboluri.length === 0
    );
    
    if (unknownSymbols.length > 0) {
      warnings.push(`${unknownSymbols.length} articole nu au simboluri detectate`);
    }

    // verificare eficienta potentiala
    const result = groupCompatibleItems(laundryItems);
    if (result.efficiency < 50) {
      warnings.push(`Eficiența grupării este scăzută (${result.efficiency}%)`);
    }
    
    return { isValid, warnings };
  };

  // validare buton de finalizare
  const handleFinishWithValidation = () => {
    const validation = validateGrouping();
    
    if (validation.warnings.length > 0) {
      Alert.alert(
        'Atenție',
        `Următoarele probleme au fost detectate:\n\n${validation.warnings.join('\n')}\n\nDoriți să continuați?`,
        [
          { text: 'Anulează', style: 'cancel' },
          { text: 'Continuă', onPress: handleManualRecommendation }
        ]
      );
    } else {
      handleManualRecommendation();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { backgroundColor: currentTheme.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>{t('scan.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.contentContainer, { backgroundColor: currentTheme.background }]}>
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

        <View style={[styles.itemsContainer, { backgroundColor: currentTheme.card }]}>
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
                <View style={[styles.itemCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 4, zIndex: 2 }}
                      onPress={() => setLaundryItems(prev => prev.filter(clothing => clothing.id !== item.id))}
                    >
                      <Ionicons name="trash-outline" size={22} color="#e57373" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemNumber}>{item.nume}</Text>
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
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: currentTheme.primary }]} onPress={handleFinishWithValidation}>
            <Text style={[styles.doneButtonText, { color: currentTheme.buttonText }]}>{t('scan.finishScanning')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card, marginTop: 32, padding: 12, minWidth: '100%', marginBottom: 64 }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontWeight: '700', fontSize: 22, color: currentTheme.text, flex: 1, textAlign: 'center' }}>Configurare program</Text>
            </View>
            <View style={{ marginBottom: 10 }}>{renderRecommendationModal()}</View>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.primary, marginTop: -30 }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalButtonText, { color: currentTheme.buttonText }]}>{t('common.close')}</Text>
            </TouchableOpacity> 
          </View>
        </View>
      </Modal>

{/* modal pt material */}
      <Modal visible={materialModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Selectează materialul</Text>
            {[
              'Bumbac',
              'Lână', 
              'Sintetic',
              'Delicat',
              'In'
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


      {/* modal pt culoare */}
      <Modal visible={colorModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Selectează culoarea</Text>
            {[
              'Alb',
              'Negru',
              'Culori deschise',
              'Culori închise', 
              'Multicolor'
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
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