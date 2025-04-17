import React, { useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Alert, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface ClothingItem {
  id: string;
  image: string;
  material: string;
  culoare: string;
  temperatura: string;
  simboluri: string[];
}

export default function ScanScreen() {
  const [laundryItems, setLaundryItems] = useState<ClothingItem[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const analyzeClothingImage = async (imageUri: string): Promise<ClothingItem | null> => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch('http://192.168.100.99:8000/api/upload/', { // manual IP 
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Error analyzing image');

      const data = await response.json();

      return {
        id: Date.now().toString(),
        image: imageUri,
        material: data.material,
        culoare: data.culoare,
        temperatura: data.temperatura,
        simboluri: data.simboluri,
      };
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not analyze the image.");
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
      Alert.alert("Permission Required", "Camera permission is needed!");
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
    Alert.alert('Scan Complete', `You've added ${laundryItems.length} items.`);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#5bafb5" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Clothing Label</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUploadImage}>
            <Ionicons name="images-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsContainer}>
          <Text style={styles.sectionTitle}>Scanned Clothes</Text>
          
          {laundryItems.length === 0 ? (
            <View style={styles.placeholder}>
              <View style={styles.iconContainer}>
                <Ionicons name="scan-outline" size={55} color="#5bafb5" />
              </View>
              <Text style={styles.emptyText}>No clothes scanned yet</Text>
            </View>
          ) : (
            <FlatList
              data={laundryItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemLabel}>Material: {item.material || 'N/A'}</Text>
                    <Text style={styles.itemLabel}>Color: {item.culoare || 'N/A'}</Text>
                    <Text style={styles.itemLabel}>Temperature: {item.temperatura || 'N/A'}</Text>
                    <Text style={styles.itemLabel}>Symbols: {Array.isArray(item.simboluri) ? item.simboluri.join(', ') : 'N/A'}</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
        
        {laundryItems.length > 0 && (
          <TouchableOpacity style={styles.doneButton} onPress={sendToGemini}>
            <Text style={styles.doneButtonText}>Finish Scanning</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Suggestion</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#5bafb5" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>{aiResponse}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
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
    backgroundColor: '#F7FAFC'
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
