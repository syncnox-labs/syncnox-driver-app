import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/apis/apiClient';
import { router } from 'expo-router';

const ACTIVATION_CODE_KEY = 'syncnox_activation_code';
const DRIVER_NAME_KEY = 'syncnox_driver_name';

interface AuthState {
  activationCode: string | null;
  driverName: string | null;
  isLoading: boolean;
  checkStoredCode: () => Promise<void>;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  activationCode: null,
  driverName: null,
  isLoading: true,

  checkStoredCode: async () => {
    try {
      const storedCode = await SecureStore.getItemAsync(ACTIVATION_CODE_KEY);
      const storedName = await SecureStore.getItemAsync(DRIVER_NAME_KEY);
      set({ activationCode: storedCode, driverName: storedName, isLoading: false });
    } catch (e) {
      set({ activationCode: null, driverName: null, isLoading: false });
    }
  },

  login: async (code: string) => {
    try {
      // 1. Verify code against backend API using Axios
      const response = await apiClient.post('/driver/verify', null, {
        headers: {
          'activation-code': code,
        },
      });

      const driverData = response.data;
      const name = driverData.name || 'Driver';

      // 2. Persist credentials
      await SecureStore.setItemAsync(ACTIVATION_CODE_KEY, code);
      await SecureStore.setItemAsync(DRIVER_NAME_KEY, name);

      set({ activationCode: code, driverName: name });
      return { success: true };
    } catch (e: any) {
      console.error('Driver activation error:', e);
      const errorMessage = e.response?.data?.detail ?? e.message ?? 'Invalid activation code. Please try again.';
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(ACTIVATION_CODE_KEY);
    } catch (e) {
      console.warn("SecureStore failed to delete activation code:", e);
    }

    try {
      await SecureStore.deleteItemAsync(DRIVER_NAME_KEY);
    } catch (e) {
      console.warn("SecureStore failed to delete driver name:", e);
    }

    set({ activationCode: null, driverName: null });
    router.replace('/');
  },
}));
