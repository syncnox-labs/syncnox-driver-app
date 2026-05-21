import * as SecureStore from 'expo-secure-store';
import { useState, useCallback } from 'react';

const ACTIVATION_CODE_KEY = 'syncnox_activation_code';

/**
 * Production-grade auth hook using expo-secure-store (Keychain/Keystore).
 *
 * Usage:
 *   const { activationCode, login, logout, isLoading } = useAuth();
 *
 * - activationCode: null = not authenticated, string = authenticated
 * - login(code): persists code to secure storage
 * - logout(): clears code from secure storage
 * - isLoading: true while checking storage on mount
 */
export function useAuth() {
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkStoredCode = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync(ACTIVATION_CODE_KEY);
      setActivationCode(stored);
    } catch (e) {
      // SecureStore not available (e.g. web) — treat as not authenticated
      setActivationCode(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (code: string) => {
    try {
      await SecureStore.setItemAsync(ACTIVATION_CODE_KEY, code);
      setActivationCode(code);
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(ACTIVATION_CODE_KEY);
      setActivationCode(null);
    } catch (e) {
      // ignore
    }
  }, []);

  return { activationCode, isLoading, login, logout, checkStoredCode };
}
