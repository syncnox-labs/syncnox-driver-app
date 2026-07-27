import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouteStore } from '@/store/route.store';
import { useAuthStore } from '@/store/auth.store';

const ACTIVATION_CODE_KEY = 'syncnox_activation_code';

function getWsBase(): string {
  const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
  // Strip /api suffix and convert scheme
  const withoutPath = rawUrl.replace(/\/api\/?$/, '');
  const wsUrl = withoutPath
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');

  // Android emulator: remap localhost → 10.0.2.2
  if (Platform.OS === 'android') {
    return wsUrl
      .replace('localhost', '10.0.2.2')
      .replace('127.0.0.1', '10.0.2.2');
  }
  return wsUrl;
}

/**
 * Hook that opens and maintains a WebSocket connection to the backend
 * driver channel: ws://host/ws/driver/{driverId}?code={activationCode}
 *
 * On receiving a 'route_assigned' event, triggers fetchMyRoutes() from the
 * route store so the UI updates in real time (all tabs stay in sync).
 *
 * Auto-reconnects with exponential backoff (1 → 2 → 4 → 8 → 16 → 30 s).
 */
export function useRouteSocket() {
  const fetchMyRoutes = useRouteStore((s) => s.fetchMyRoutes);
  const activationCode = useAuthStore((s) => s.activationCode);
  const driverId = useAuthStore((s) => s.driverId);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    // Wait until both activationCode AND driverId are available
    if (!activationCode || !driverId) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;

    async function connect() {
      // Prefer in-memory store values; fall back to SecureStore for code
      let code = activationCode;
      if (!code) {
        try {
          code = await SecureStore.getItemAsync(ACTIVATION_CODE_KEY);
        } catch (_) {}
      }
      if (!code || !driverId || !isMounted.current) return;

      const wsBase = getWsBase();
      // Use the real driver ID from the auth store — backend validates it against the code
      const url = `${wsBase}/ws/driver/${driverId}?code=${encodeURIComponent(code)}`;

      console.log(`[WS] Connecting to ${url}`);

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WS] Driver channel connected ✓');
          reconnectDelay.current = 1000; // reset backoff on successful connect
          // Fetch all routes immediately in case we missed a push event
          fetchMyRoutes();
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === 'route_assigned') {
              console.log('[WS] route_assigned received — fetching all routes');
              fetchMyRoutes();
            }
          } catch (_) {}
        };

        ws.onerror = () => {
          // onerror is always followed by onclose; log minimally
          console.warn('[WS] Driver channel error — will reconnect');
        };

        ws.onclose = () => {
          console.log(`[WS] Driver channel closed — retrying in ${reconnectDelay.current}ms`);
          if (!isMounted.current) return;
          // Exponential backoff, cap at 30 s
          reconnectTimer = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
            connect();
          }, reconnectDelay.current);
        };
      } catch (e) {
        console.warn('[WS] Connection failed:', e);
        reconnectTimer = setTimeout(connect, reconnectDelay.current);
      }
    }

    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [activationCode, driverId, fetchMyRoutes]);
}
