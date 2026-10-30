import { Stack } from 'expo-router';
import { useRouteSocket } from '@/hooks/useRouteSocket';

export default function HomeLayout() {
  // Single driver WebSocket for every screen under (home) — previously home and map each opened one.
  useRouteSocket();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="stop-detail" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="route-detail" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
