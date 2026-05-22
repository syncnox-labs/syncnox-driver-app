import { useAuthStore } from '@/store/auth.store';

/**
 * Auth hook wrapper that delegates to the useAuthStore Zustand store.
 * This preserves clean component hook usage while leveraging Zustand under the hood.
 */
export function useAuth() {
  const { activationCode, driverName, isLoading, login, logout, checkStoredCode } = useAuthStore();
  return { activationCode, driverName, isLoading, login, logout, checkStoredCode };
}
