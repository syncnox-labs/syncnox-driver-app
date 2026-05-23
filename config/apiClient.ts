import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const ACTIVATION_CODE_KEY = 'syncnox_activation_code';
const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

export const API_BASE_URL = rawUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach activation-code header from SecureStore on every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const code = await SecureStore.getItemAsync(ACTIVATION_CODE_KEY);
      if (code) {
        config.headers['activation-code'] = code;
      }
    } catch (e) {
      console.warn('apiClient interceptor error:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);
