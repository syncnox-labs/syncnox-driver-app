import "../global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouteReminders } from "@/hooks/useRouteReminders";
import { View, StatusBar, LogBox } from "react-native";

import { ActivityIndicator, PaperProvider, MD3DarkTheme } from "react-native-paper";

LogBox.ignoreAllLogs();

export const unstable_settings = { initialRouteName: 'index' };

// Syncnox brand theme for React Native Paper
const syncnoxTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#30D158",
    secondary: "#1C1C1E",
    background: "#000000",
    surface: "#1C1C1E",
    onPrimary: "#FFFFFF",
    onBackground: "#FFFFFF",
    onSurface: "#FFFFFF",
    error: "#FF453A",
  },
};

/**
 * Root layout — imports global.css (NativeWind), wraps with PaperProvider,
 * restores the saved session before mounting mutually exclusive guest / signed-in routes.
 */
export default function RootLayout() {
  useRouteReminders();
  const { activationCode, isLoading, checkStoredCode } = useAuthStore();

  useEffect(() => {
    checkStoredCode();
  }, [checkStoredCode]);

  if (isLoading) {
    return (
      <PaperProvider theme={syncnoxTheme}>
        <View className="flex-1 bg-bg-deep items-center justify-center">
          <ActivityIndicator color="#30D158" size="large" />
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={syncnoxTheme}>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#000000" },
        }}
      >
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Protected guard={!activationCode}>
          <Stack.Screen name="welcome" options={{ animation: "fade" }} />
          <Stack.Screen name="login" options={{ animation: "slide_from_right" }} />
        </Stack.Protected>
        <Stack.Protected guard={!!activationCode}>
          <Stack.Screen name="(home)" options={{ animation: "fade" }} />
        </Stack.Protected>
      </Stack>
    </PaperProvider>
  );
}
