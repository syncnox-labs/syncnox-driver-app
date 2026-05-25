import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/config/apiClient';
import { router } from 'expo-router';

const ACTIVATION_CODE_KEY = 'syncnox_activation_code';
const DRIVER_NAME_KEY = 'syncnox_driver_name';
const DRIVER_ID_KEY = 'syncnox_driver_id';

interface AuthState {
  code: string;
  activationCode: string | null;
  driverName: string | null;
  driverId: number | null;  // ← the driver's actual numeric DB ID
  isLoading: boolean;
  setCode: (code: string) => void;
  checkStoredCode: () => Promise<void>;
  login: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  code: '',
  activationCode: null,
  driverName: null,
  driverId: null,
  isLoading: true,

  setCode: (code) => set({ code }),

  checkStoredCode: async () => {
    try {
      const storedCode = await SecureStore.getItemAsync(ACTIVATION_CODE_KEY);
      const storedName = await SecureStore.getItemAsync(DRIVER_NAME_KEY);
      const storedIdStr = await SecureStore.getItemAsync(DRIVER_ID_KEY);
      const storedId = storedIdStr ? parseInt(storedIdStr, 10) : null;
      set({
        activationCode: storedCode,
        driverName: storedName,
        driverId: storedId,
        isLoading: false,
      });
    } catch (e) {
      set({ activationCode: null, driverName: null, driverId: null, isLoading: false });
    }
  },

  login: async () => {
    const code = get().code;
    try {
      // 1. Persist code first so the apiClient interceptor can attach it
      await SecureStore.setItemAsync(ACTIVATION_CODE_KEY, code);

      // 2. Verify — interceptor auto-attaches 'activation-code' header
      const response = await apiClient.post('/driver/verify', null);

      const driverData = response.data;
      const name = driverData.name || 'Driver';
      const id: number = driverData.id;

      // 3. Persist driver name and ID
      await SecureStore.setItemAsync(DRIVER_NAME_KEY, name);
      await SecureStore.setItemAsync(DRIVER_ID_KEY, String(id));

      set({ activationCode: code, driverName: name, driverId: id });
      return { success: true };
    } catch (e: any) {
      // Clean up stored code on failure
      await SecureStore.deleteItemAsync(ACTIVATION_CODE_KEY).catch(() => {});
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

    try {
      await SecureStore.deleteItemAsync(DRIVER_ID_KEY);
    } catch (e) {
      console.warn("SecureStore failed to delete driver id:", e);
    }

    set({ activationCode: null, driverName: null, driverId: null });
    router.replace('/');
  },
}));
