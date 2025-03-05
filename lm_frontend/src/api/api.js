import axios from 'axios';

const API_BASE_URL = "http://127.0.0.1:8000/api";

export const uploadImage = async (formData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/upload/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading image:", error);
        return null;
    }
};
