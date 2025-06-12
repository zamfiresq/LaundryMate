import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Alert, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { lightTheme, darkTheme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';

interface ClothingItem {
  id: string;
  image: string;
  material: string;
  culoare: string;
  temperatura: string;
  simboluri: string[];
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
      const detectedSymbols = predictionsArray.map((item: any) => item.label).filter(Boolean);
      console.log('Detected symbol names:', detectedSymbols);

      const { temperatura, material, culoare } = getDetailsFromSymbols(detectedSymbols);

      return {
        id: Date.now().toString(),
        image: imageUri,
        material,
        culoare,
        temperatura,
        simboluri: detectedSymbols,
      };
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('scan.scanError'));
      return null;
    }
  };

  const handleUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
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

  const handleTakePhoto = async () => {
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

  const sendToGemini = async () => {
    const prompt = `I have these clothes: ${JSON.stringify(laundryItems, null, 2)}. Recommend a washing program for a Samsung machine.`;

    // ai simulation response
    // ML part integration?
    const fakeResponse = "I recommend the 'Mixed 40°C' program with 800 rpm spin. Select the 'Eco Cotton' option if the machine is Samsung brand.";
    
    setAiResponse(fakeResponse);
    setModalVisible(true);
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
              renderItem={({ item }) => (
                <View style={[styles.itemCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }] }>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemLabel, { color: currentTheme.text }]}>{t('scan.material')}: {item.material || 'N/A'}</Text>
                    <Text style={[styles.itemLabel, { color: currentTheme.text }]}>{t('scan.color')}: {item.culoare || 'N/A'}</Text>
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
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: currentTheme.primary }]} onPress={sendToGemini}>
            <Text style={[styles.doneButtonText, { color: currentTheme.buttonText }]}>{t('scan.finishScanning')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card }] }>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{t('scan.aiSuggestion')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={currentTheme.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalText, { color: currentTheme.textSecondary }]}>{aiResponse}</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.primary }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalButtonText, { color: currentTheme.buttonText }]}>{t('common.close')}</Text>
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
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#5bafb5',
    paddingVertical: 16,
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
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  itemDetails: {
    padding: 16,
  },
  itemLabel: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
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
    borderRadius: 16,
    width: '100%',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
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
});
