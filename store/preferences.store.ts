import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as sessionStorage from '@/utils/sessionStorage';

export type NavigationApp = 'google' | 'waze' | 'apple';
export const navigationLabels: Record<NavigationApp, string> = {
  google: 'Google Maps',
  waze: 'Waze',
  apple: 'Apple Maps',
};

export const usePreferencesStore = create(persist<{
  navigationApp: NavigationApp;
  setNavigationApp: (app: NavigationApp) => void;
}>((set) => ({
  navigationApp: 'google',
  setNavigationApp: (navigationApp) => set({ navigationApp }),
}), {
  name: 'syncnox_navigation_preferences',
  storage: createJSONStorage(() => ({
    getItem: sessionStorage.getItemAsync,
    setItem: (key, value) => sessionStorage.setItemAsync(key, value).catch(() => {
      console.warn('Unable to save navigation preference. It will apply until the app closes.');
    }),
    removeItem: (key) => sessionStorage.deleteItemAsync(key).catch(() => {}),
  })),
}));
