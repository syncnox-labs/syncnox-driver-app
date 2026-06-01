import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="stop-detail" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
