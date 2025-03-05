import React, { useState } from 'react';
import { View, Button, Image, Text, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../api';

const ScanScreen = () => {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [symbols, setSymbols] = useState([]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.uri);
        }
    };

    const handleUpload = async () => {
        if (!image) return;
        
        setLoading(true);
        let formData = new FormData();
        formData.append('image', {
            uri: image,
            name: 'garment.jpg',
            type: 'image/jpeg'
        });

        const data = await uploadImage(formData);
        if (data) {
            setSymbols(data.detected_symbols);
        }
        setLoading(false);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {image && <Image source={{ uri: image }} style={{ width: 200, height: 200 }} />}
            <Button title="Alege Imagine" onPress={pickImage} />
            <Button title="Scanează Eticheta" onPress={handleUpload} />
            {loading && <ActivityIndicator size="large" />}
            {symbols.length > 0 && (
                <View>
                    <Text>Simboluri detectate:</Text>
                    {symbols.map((symbol, index) => (
                        <Text key={index}>{symbol.class_id}</Text>
                    ))}
                </View>
            )}
        </View>
    );
};

export default ScanScreen;
