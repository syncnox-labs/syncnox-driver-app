import { create } from 'zustand';
import * as sessionStorage from '@/utils/sessionStorage';
import { apiClient } from '@/config/apiClient';
import { JobTemplateType } from '@/types/route.types';

const ACTIVATION_CODE_KEY = 'syncnox_activation_code';
const DRIVER_NAME_KEY = 'syncnox_driver_name';
const DRIVER_ID_KEY = 'syncnox_driver_id';
const JOB_TEMPLATE_KEY = 'syncnox_job_template';

interface AuthState {
  code: string;
  activationCode: string | null;
  driverName: string | null;
  driverId: number | null;  // ← the driver's actual numeric DB ID
  jobTemplate: JobTemplateType | null;  // tenant's active job template
  isLoading: boolean;
  setJobTemplate: (template: JobTemplateType) => void;
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
  jobTemplate: null,
  isLoading: true,

  setJobTemplate: (template) => {
    if (get().jobTemplate === template) return;
    set({ jobTemplate: template });
    sessionStorage.setItemAsync(JOB_TEMPLATE_KEY, template).catch(() => {});
  },

  setCode: (code) => set({ code }),

  checkStoredCode: async () => {
    try {
      const storedCode = await sessionStorage.getItemAsync(ACTIVATION_CODE_KEY);
      // Optional profile metadata must not invalidate a saved activation code.
      const [storedName, storedIdStr, storedTemplate] = await Promise.all([
        sessionStorage.getItemAsync(DRIVER_NAME_KEY).catch(() => null),
        sessionStorage.getItemAsync(DRIVER_ID_KEY).catch(() => null),
        sessionStorage.getItemAsync(JOB_TEMPLATE_KEY).catch(() => null),
      ]);
      const parsedId = storedIdStr ? Number(storedIdStr) : NaN;
      const storedId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
      set({
        activationCode: storedCode,
        driverName: storedName,
        driverId: storedId,
        jobTemplate: storedTemplate === 'worker_shuttle' || storedTemplate === 'pickup_delivery_job' ? storedTemplate : null,
        isLoading: false,
      });
    } catch {
      set({ activationCode: null, driverName: null, driverId: null, jobTemplate: null, isLoading: false });
    }
  },

  login: async () => {
    const code = get().code;
    try {
      // 1. Persist code first so the apiClient interceptor can attach it
      await sessionStorage.setItemAsync(ACTIVATION_CODE_KEY, code);

      // 2. Verify — interceptor auto-attaches 'activation-code' header
      const response = await apiClient.post('/driver/verify', null);

      const driverData = response.data;
      const name = driverData.name || 'Driver';
      const id: number = driverData.id;

      // 3. Persist driver name and ID
      await sessionStorage.setItemAsync(DRIVER_NAME_KEY, name);
      await sessionStorage.setItemAsync(DRIVER_ID_KEY, String(id));
      const template: JobTemplateType =
        driverData.active_job_template === 'worker_shuttle' ? 'worker_shuttle' : 'pickup_delivery_job';
      await sessionStorage.setItemAsync(JOB_TEMPLATE_KEY, template);

      set({ activationCode: code, driverName: name, driverId: id, jobTemplate: template });
      return { success: true };
    } catch (e: any) {
      // Clean up stored code on failure
      await sessionStorage.deleteItemAsync(ACTIVATION_CODE_KEY).catch(() => {});
      console.error('Driver activation error:', e);
      const errorMessage = e.response?.data?.detail ?? e.message ?? 'Invalid activation code. Please try again.';
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    try {
      await sessionStorage.deleteItemAsync(ACTIVATION_CODE_KEY);
    } catch (e) {
      console.warn("Session storage failed to delete activation code:", e);
    }

    try {
      await sessionStorage.deleteItemAsync(DRIVER_NAME_KEY);
    } catch (e) {
      console.warn("Session storage failed to delete driver name:", e);
    }

    try {
      await sessionStorage.deleteItemAsync(DRIVER_ID_KEY);
    } catch (e) {
      console.warn("Session storage failed to delete driver id:", e);
    }

    try {
      await sessionStorage.deleteItemAsync(JOB_TEMPLATE_KEY);
    } catch (e) {
      console.warn("Session storage failed to delete job template:", e);
    }

    // Root route protection removes the signed-in history when the session is cleared.
    set({ code: '', activationCode: null, driverName: null, driverId: null, jobTemplate: null });
  },
}));
